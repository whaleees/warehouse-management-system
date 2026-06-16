"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import StatusBadge from "@/components/ui/status-badge";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { useRole } from "@/lib/roles";
import { formatDate } from "@/lib/format";
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

  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();

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

  // Use backend-calculated received/remaining.
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

  // Keep quantity within 1..remaining for the selected product.
  const maxQty = selectedItemStat ? Math.max(selectedItemStat.remaining, 0) : 0;
  const clampQty = (n: number) => {
    const v = Number.isFinite(n) ? Math.floor(n) : 0;
    if (v < 0) return 0;
    if (maxQty > 0 && v > maxQty) return maxQty;
    return v;
  };

  async function addLine() {
    if (!gr) return;
    if (!selectedItemId) return toast.error("Choose a product to receive first.");
    if (!batchNumber.trim()) return toast.error("Enter the batch number on the box.");
    if (!locationId.trim()) return toast.error("Choose where to put the stock.");
    if (!qty || qty <= 0) return toast.error("Enter how many you received (at least 1).");
    if (!expiryDate) return toast.error("Enter the expiry date from the box.");

    const item = gr.purchaseOrder.items.find((i) => i.id === selectedItemId);
    if (!item) return toast.error("That product is no longer on this order. Pick another.");

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
      toast.success(`Added ${qty} ${item.product.name} to this receipt.`);
    } catch {
      toast.error(
        "Couldn't add that to the receipt. Check the amount fits the space and try again.",
      );
    }
    setActing(false);
  }

  async function finalize(autoPostStock: boolean) {
    if (!gr) return;

    const ok = await confirm({
      title: autoPostStock
        ? "Finalize and add these items to stock?"
        : "Finalize without changing stock?",
      description: autoPostStock
        ? "This closes the receipt and adds everything you logged into warehouse stock. This can't be undone."
        : "This closes the receipt but does NOT add anything to stock. Use this only when stock was already counted elsewhere. This can't be undone.",
      confirmLabel: autoPostStock ? "Finalize & add to stock" : "Finalize only",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/inbound/${gr.id}/finalize`, {
            method: "POST",
            body: JSON.stringify({ autoPostStock }),
          });
        } catch {
          throw new Error(
            "Couldn't finalize this receipt. Check the items and try again.",
          );
        }
      },
    });

    if (ok) {
      await loadInbound();
      toast.success(
        autoPostStock
          ? "Receipt finalized and items added to stock."
          : "Receipt finalized. Stock was not changed.",
      );
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading goods receipt…" />
      </DashboardShell>
    );
  }

  if (!gr) {
    return (
      <DashboardShell>
        <EmptyState message="We couldn't find that goods receipt. It may have been removed." />
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
              className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
              onClick={() => router.push("/inbound")}
              aria-label="Back to goods receipts"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  {gr.receiptNumber}
                </h1>
                <StatusBadge kind="gr" status={gr.status} />
              </div>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                From purchase order{" "}
                <button
                  className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
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
            <div className="flex flex-wrap justify-end gap-3">
              {can("manage:business") && (
                <Button
                  variant="outline"
                  onClick={() => finalize(false)}
                  disabled={acting}
                >
                  <PackageOpen size={16} /> Finalize only — don&apos;t change stock
                </Button>
              )}

              {can("manage:business") && (
                <Button
                  variant="primary"
                  onClick={() => finalize(true)}
                  disabled={acting}
                >
                  <CheckCircle2 size={16} /> Finalize &amp; add to stock
                </Button>
              )}
            </div>
          )}
        </div>

        {/* INFO CARD */}
        <Card className="p-5">
          <div className="flex flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">

            <div className="space-y-1">
              <p className="text-[var(--muted-foreground)]">Supplier</p>
              <p className="font-medium text-[var(--foreground)]">
                {gr.purchaseOrder.supplier?.name}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Code: {gr.purchaseOrder.supplier?.code}
              </p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-1 text-[var(--muted-foreground)]">
                <Clock3 size={14} /> Received on
              </p>
              <p className="font-medium text-[var(--foreground)]">
                {formatDate(gr.receivedAt)}
              </p>
            </div>

            <div className="space-y-1 text-sm md:text-right">
              <p className="text-[var(--muted-foreground)]">
                Ordered: <span className="text-[var(--foreground)]">{totalSummary.ordered}</span>
              </p>
              <p className="text-[var(--muted-foreground)]">
                Received:{" "}
                <span className="font-medium text-[var(--success-text)]">
                  {totalSummary.received}
                </span>
              </p>
              <p className="text-[var(--muted-foreground)]">
                Remaining: <span className="text-[var(--foreground)]">{totalSummary.remaining}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* LAYOUT GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* LEFT TABLE */}
          <Card className="overflow-hidden p-0 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
              <FileText size={16} className="text-[var(--muted-foreground)]" />
              <h2 className="text-base font-semibold text-[var(--card-foreground)]">
                Items on this order
              </h2>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)]">
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
                    className={`cursor-pointer border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)] ${
                      it.id === selectedItemId ? "bg-[var(--bg-hover)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--foreground)]">
                          {it.product.name}
                        </span>
                        <span
                          className="text-xs text-[var(--muted-foreground)]"
                          title="Stock keeping unit: the product's unique code."
                        >
                          Item code: {it.product.sku}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right text-[var(--foreground)]">
                      {it.quantity} {it.product.uom}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-[var(--success-text)]">
                      {it.received}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {it.remaining <= 0 ? (
                        <span className="font-medium text-[var(--success-text)]">0</span>
                      ) : (
                        <span className="text-[var(--foreground)]">{it.remaining}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* RIGHT PANEL */}
          <Card className="flex flex-col gap-4 p-5">

            <div className="mb-1 flex items-center gap-2">
              <PackageSearch size={16} className="text-[var(--muted-foreground)]" />
              <h2 className="text-base font-semibold text-[var(--card-foreground)]">
                Receive items
              </h2>
            </div>

            {/* SELECTED ITEM SUMMARY */}
            <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
              {selectedItemStat ? (
                <>
                  <p className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                    <Barcode size={14} /> {selectedItemStat.product.name}
                  </p>
                  <p
                    className="text-xs text-[var(--muted-foreground)]"
                    title="Stock keeping unit: the product's unique code."
                  >
                    Item code: {selectedItemStat.product.sku}
                  </p>

                  <div className="mt-1 flex justify-between text-[var(--muted-foreground)]">
                    <span>Ordered: {selectedItemStat.quantity}</span>
                    <span className="text-[var(--success-text)]">
                      Received: {selectedItemStat.received}
                    </span>
                    <span>Remaining: {selectedItemStat.remaining}</span>
                  </div>
                </>
              ) : (
                <p className="text-[var(--muted-foreground)]">
                  Pick a product from the list to start receiving.
                </p>
              )}
            </div>

            {/* PRODUCT SELECT */}
            <div className="flex flex-col gap-1.5 text-sm">
              <label className="font-medium text-[var(--foreground)]">Product</label>

              <select
                className="input-style"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={isReadOnly}
              >
                {gr.purchaseOrder.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.product.name} (item code {it.product.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* BATCH NUMBER */}
            <Input
              label="Batch number"
              hint="The batch or lot number printed on the box."
              placeholder="e.g. BATCH-001"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              disabled={isReadOnly}
            />

            {/* EXPIRY DATE */}
            <Input
              label="Expiry date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={isReadOnly}
            />

            {/* SECTION → LOCATION */}
            <div className="flex flex-col gap-2 text-sm">

              <label className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                <MapPin size={14} /> Where to put it
              </label>

              {/* Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--muted-foreground)]">Section</span>

                <select
                  className="input-style"
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
                  <option value="">Choose a section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.code}
                      {sec.description ? ` — ${sec.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--muted-foreground)]">Location</span>

                <select
                  className="input-style"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={isReadOnly || !selectedSectionId}
                >
                  <option value="">Choose a location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code}
                      {loc.description
                        ? ` — ${loc.description}`
                        : loc.type
                        ? ` — ${loc.type}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* QUANTITY */}
            <Input
              label="Quantity received"
              type="number"
              min={1}
              max={maxQty > 0 ? maxQty : undefined}
              hint={
                selectedItemStat
                  ? `Up to ${maxQty} left to receive.`
                  : "Pick a product first."
              }
              value={qty}
              onChange={(e) => setQty(clampQty(Number(e.target.value)))}
              disabled={isReadOnly}
            />

            {/* ADD LINE */}
            {can("receive:goods") && (
              <Button
                variant="primary"
                className="w-full"
                onClick={addLine}
                disabled={isReadOnly || acting}
                loading={acting}
              >
                <Truck size={16} />
                Add to receipt
              </Button>
            )}

            {/* LINES */}
            <div className="mt-2 border-t border-[var(--border)] pt-3">
              <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
                <FileText size={14} /> Already received
              </p>

              {gr.lines.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nothing logged yet. Fill in the form above and choose Add to receipt.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-auto text-sm">
                  {gr.lines.map((ln) => (
                    <div
                      key={ln.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-[var(--foreground)]">
                          {ln.product.name}
                        </span>
                        <span className="text-[var(--foreground)]">
                          {ln.quantity} {ln.product.uom}
                        </span>
                      </div>

                      <div className="mt-1 flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Batch: {ln.batch.batchNumber}</span>
                        <span>
                          Location: {ln.location.code}
                          {ln.location.section
                            ? ` (${ln.location.section.code})`
                            : ""}
                        </span>
                      </div>

                      {ln.batch.expiryDate && (
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Expires: {formatDate(ln.batch.expiryDate)}
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
