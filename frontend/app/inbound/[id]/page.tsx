"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { grStatusColor } from "@/lib/status";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { useInboundDetail } from "./use-inbound-detail";

import {
  ArrowLeft,
  Truck,
  FileText,
  PackageSearch,
  CheckCircle2,
  Barcode,
  MapPin,
  PackageOpen,
  Clock3,
} from "lucide-react";


export default function InboundDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const {
    gr,
    loading,
    sections,
    locations,
    setLocations,
    reload: loadInbound,
    loadLocations,
  } = useInboundDetail(id);

  const [acting, setActing] = useState(false);

  // Scanner state
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");
  const [qty, setQty] = useState<number>(0);

  // Sections/Locations
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expiryDate, setExpiryDate] = useState<string>("");

  // Auto-select first PO item once the GR loads (only when nothing is selected).
  useEffect(() => {
    if (gr?.purchaseOrder?.items?.length && !selectedItemId) {
      setSelectedItemId(gr.purchaseOrder.items[0].id);
    }
  }, [gr, selectedItemId]);

  // --------------------------------------------
  // 🚀 FIXED: Use backend-calculated received/remaining
  // --------------------------------------------
  const itemStats = useMemo(() => {
    if (!gr) return [];

    return gr.purchaseOrder.items.map((it) => ({
      ...it,
      received: it.received ?? 0,
      remaining:
        it.remaining ??
        Math.max(it.quantity - (it.received ?? 0), 0),
    }));
  }, [gr]);

  const selectedItemStat = useMemo(() => {
    if (!gr || !selectedItemId) return null;
    return itemStats.find((it) => it.id === selectedItemId) ?? null;
  }, [gr, itemStats, selectedItemId]);

  const totalSummary = useMemo(() => {
    if (!gr) return { ordered: 0, received: 0, remaining: 0 };

    let ordered = 0;
    let received = 0;

    itemStats.forEach((it) => {
      ordered += it.quantity;
      received += it.received ?? 0;
    });

    return { ordered, received, remaining: ordered - received };
  }, [itemStats, gr]);

  async function addLine() {
    if (!gr) return;
    if (!selectedItemId) return alert("Please select a product.");
    if (!batchNumber.trim()) return alert("Batch number required.");
    if (!locationId.trim()) return alert("Select a location.");
    if (!qty || qty <= 0) return alert("Qty must be > 0.");
    if (!expiryDate) return alert("Expiry date required."); 

    const item = gr.purchaseOrder.items.find((i) => i.id === selectedItemId);
    if (!item) return alert("Invalid item.");

    setActing(true);
    try {
      await api(`/inbound/${gr.id}/line`, {
        method: "POST",
        body: JSON.stringify({
          purchaseOrderItemId: item.id,
          productId: item.product.id,
          batchNumber,
          locationId,
          quantity: qty,
          expiryDate
        }),
      });

      setQty(0);
      setBatchNumber("");
      setExpiryDate("");
      await loadInbound();
    } catch {
      alert("Failed to add line.");
    }
    setActing(false);
  }

  async function finalize(autoPostStock: boolean) {
    if (!gr) return;

    const msg = autoPostStock
      ? "Finalize and post stock?"
      : "Finalize WITHOUT posting stock?";

    if (!confirm(msg)) return;

    setActing(true);
    try {
      await api(`/inbound/${gr.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ autoPostStock }),
      });

      await loadInbound();
    } catch {
      alert("Failed to finalize.");
    }
    setActing(false);
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState className="text-sm text-[var(--text-muted)]" message="Loading inbound..." />
      </DashboardShell>
    );
  }

  if (!gr) {
    return (
      <DashboardShell>
        <EmptyState className="text-sm text-red-400" message="Inbound not found." />
      </DashboardShell>
    );
  }

  const isReadOnly = gr.status === "RECEIVED";

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-[#1a1b1f] rounded-lg transition"
              onClick={() => router.push("/inbound")}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{gr.receiptNumber}</h1>
                <Badge color={grStatusColor(gr.status)}>{gr.status}</Badge>
              </div>

              <p className="text-xs text-[var(--text-muted)] mt-1">
                Linked PO:{" "}
                <button
                  className="underline-offset-2 hover:underline text-white"
                  onClick={() =>
                    router.push(`/purchase-orders/${gr.purchaseOrder.id}`)
                  }
                >
                  {gr.purchaseOrder.orderNumber}
                </button>
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => finalize(false)}
                disabled={acting}
              >
                <PackageOpen size={14} /> Finalize (No Stock Post)
              </Button>

              <Button
                size="sm"
                onClick={() => finalize(true)}
                disabled={acting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 size={14} /> Finalize & Post Stock
              </Button>
            </div>
          )}
        </div>

        {/* INFO CARD */}
        <Card className="p-5 bg-[#111217] border border-[#1c1d22]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">

            <div className="space-y-1">
              <p className="text-[var(--text-muted)]">Supplier</p>
              <p className="font-medium">{gr.purchaseOrder.supplier?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Code: {gr.purchaseOrder.supplier?.code}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[var(--text-muted)] flex items-center gap-1">
                <Clock3 size={14} /> Received At
              </p>
              <p className="font-medium">{formatDate(gr.receivedAt)}</p>
            </div>

            <div className="space-y-1 text-right text-xs text-[var(--text-muted)]">
              <p>Ordered: {totalSummary.ordered}</p>
              <p className="text-emerald-400">
                Received: {totalSummary.received}
              </p>
              <p>Remaining: {totalSummary.remaining}</p>
            </div>
          </div>
        </Card>

        {/* LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT TABLE */}
          <Card className="p-0 bg-[#111217] border border-[#1c1d22] lg:col-span-2 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1c1d22] flex items-center gap-2">
              <FileText size={16} />
              <h2 className="text-sm font-semibold">Purchase Order Items</h2>
            </div>

            <table className="w-full text-xs">
              <thead className="bg-[#0e0f12] text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-right">Ordered</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                </tr>
              </thead>

              <tbody>
                {itemStats.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => setSelectedItemId(it.id)}
                    className={`border-t border-[#1c1d22] cursor-pointer hover:bg-[#15171e] ${
                      it.id === selectedItemId ? "bg-[#15171e]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{it.product.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          SKU: {it.product.sku}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {it.quantity} {it.product.uom}
                    </td>

                    <td className="px-4 py-3 text-right text-emerald-400">
                      {it.received}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {it.remaining <= 0 ? (
                        <span className="text-emerald-400 font-medium">0</span>
                      ) : (
                        it.remaining
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* RIGHT PANEL */}
          <Card className="p-5 bg-[#111217] border border-[#1c1d22] flex flex-col gap-4">

            <div className="flex items-center gap-2 mb-1">
              <PackageSearch size={16} />
              <h2 className="text-sm font-semibold">Scan / Add Line</h2>
            </div>

            {/* SELECTED ITEM SUMMARY */}
            <div className="text-xs bg-[#15171e] border border-[#23252e] rounded-lg p-3 space-y-1">
              {selectedItemStat ? (
                <>
                  <p className="font-medium flex items-center gap-1">
                    <Barcode size={12} /> {selectedItemStat.product.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    SKU: {selectedItemStat.product.sku}
                  </p>

                  <div className="flex justify-between mt-1">
                    <span>Ordered: {selectedItemStat.quantity}</span>
                    <span className="text-emerald-400">
                      Received: {selectedItemStat.received}
                    </span>
                    <span>
                      Remaining: {selectedItemStat.remaining}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[var(--text-muted)]">
                  Select a product to receive.
                </p>
              )}
            </div>

            {/* PRODUCT SELECT */}
            <div className="space-y-1 text-xs">
              <label className="text-[var(--text-muted)]">Product</label>

              <select
                className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 text-xs"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={isReadOnly}
              >
                {gr.purchaseOrder.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.product.name} (SKU: {it.product.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* BATCH NUMBER */}
            <div className="space-y-1 text-xs">
              <label className="text-[var(--text-muted)]">Batch Number</label>

              <input
                className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 text-xs"
                placeholder="e.g. BATCH-001"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            {/* EXPIRY DATE */}
            <div className="space-y-1 text-xs">
              <label className="text-[var(--text-muted)]">Expiry Date</label>

              <input
                type="date"
                className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 text-xs"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            {/* SECTION → LOCATION */}
            <div className="space-y-2 text-xs">

              <label className="text-[var(--text-muted)] flex items-center gap-1">
                <MapPin size={12} /> Receive Into Location
              </label>

              {/* Section */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Section
                </span>

                <select
                  className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 text-xs"
                  value={selectedSectionId}
                  onChange={async (e) => {
                    const sid = e.target.value;
                    setSelectedSectionId(sid);
                    setLocationId("");
                    setLocations([]);

                    if (sid) await loadLocations(sid);
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Location
                </span>

                <select
                  className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 text-xs"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={isReadOnly || !selectedSectionId}
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* QUANTITY */}
            <div className="space-y-1 text-xs">
              <label className="text-[var(--text-muted)]">Quantity</label>

              <input
                type="number"
                className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 text-xs"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                disabled={isReadOnly}
              />
            </div>

            {/* ADD LINE */}
            <Button
              onClick={addLine}
              disabled={isReadOnly || acting}
              className="
                w-full flex items-center justify-center gap-2 mt-2
                bg-white text-black font-semibold 
                hover:bg-gray-200 transition
              "
            >
              <Truck size={14} className="text-black" />
              Add Inbound Line
            </Button>

            {/* LINES */}
            <div className="pt-3 border-t border-[#23252e] mt-2">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <FileText size={12} /> Lines in this GR
              </p>

              {gr.lines.length === 0 ? (
                <p className="text-[10px] text-[var(--text-muted)]">
                  No lines yet.
                </p>
              ) : (
                <div className="max-h-64 overflow-auto space-y-2 text-[11px]">
                  {gr.lines.map((ln) => (
                    <div
                      key={ln.id}
                      className="bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{ln.product.name}</span>
                        <span>
                          {ln.quantity} {ln.product.uom}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                        <span>Batch: {ln.batch.batchNumber}</span>
                        <span>
                          Loc: {ln.location.code}
                          {ln.location.section
                            ? ` (${ln.location.section.code})`
                            : ""}
                        </span>
                      </div>

                      {ln.batch.expiryDate && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          Exp: {formatDate(ln.batch.expiryDate)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>
    </DashboardShell>
  );
}
