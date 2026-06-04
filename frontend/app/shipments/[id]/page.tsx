"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { shipmentStatusColor } from "@/lib/status";

import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";

interface SalesOrderItem {
  id: string;
  product: { id: string; name: string; sku: string; uom: string };
  quantity: number;
  shippedQty: number;
}

interface Section {
  id: string;
  code: string;
}

interface Location {
  id: string;
  code: string;
  type: string;
}


export default function ShipmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [shipment, setShipment] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [acting, setActing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState(1);

  // inventory rows to validate stock
  const [inventoryRows, setInventoryRows] = useState<any[]>([]);

  // ==========================
  // LOAD DATA
  // ==========================

  async function loadShipmentAndSo() {
    try {
      const sh = await api(`/shipment/${id}`);
      setShipment(sh);

      const so = await api(`/sales-order/${sh.salesOrderId}`);
      setSalesOrder(so);

      const mapped = so.items.map((it: any) => {
        const shipped = sh.lines
          .filter((l: any) => l.salesOrderItemId === it.id)
          .reduce((sum: number, x: any) => sum + x.quantity, 0);

        return { ...it, shippedQty: shipped };
      });

      setItems(mapped);
    } catch (err) {
      console.error("Load shipment failed:", err);
      setShipment(null);
      setSalesOrder(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadSections() {
    const res = await api("/sections");
    const list = Array.isArray(res) ? res : res.data ?? [];
    setSections(list);
  }

  async function loadLocations(sectionId: string) {
    if (!sectionId) {
      setLocations([]);
      return;
    }
    const res = await api(`/sections/${sectionId}/locations`);
    const list = Array.isArray(res) ? res : res.data ?? [];
    setLocations(list);
  }

  async function loadInventory() {
    const res = await api("/inventory");
    const list = Array.isArray(res) ? res : res.data ?? [];
    setInventoryRows(list);
  }

  useEffect(() => {
    loadShipmentAndSo();
    loadSections();
    loadInventory();
  }, []);

  const isDraft = shipment?.status === "DRAFT";
  const isInTransit = shipment?.status === "IN_TRANSIT";

  // ==========================
  // HELPERS
  // ==========================

  function handleSelectItem(value: string) {
    setSelectedItem(value); // item independent from section/location
  }

  async function handleSelectSection(sectionId: string) {
    setSelectedSection(sectionId);
    setSelectedLocation("");
    setLocations([]);

    if (sectionId) {
      await loadLocations(sectionId);
    }
  }

  function getAvailableFor(productId: string, locationId: string): number {
    const rows = inventoryRows.filter((row) => {
      const rowProdId = row.productId ?? row.product?.id;
      const rowLocId = row.locationId ?? row.location?.id;
      return rowProdId === productId && rowLocId === locationId;
    });

    if (rows.length === 0) return 0;

    return rows.reduce((sum, row) => {
      const available =
        row.availableQty ??
        row.availableQuantity ??
        row.qty ??
        row.quantity ??
        0;
      return sum + (Number(available) || 0);
    }, 0);
  }

  // ==========================
  // ACTIONS
  // ==========================

  async function addLine() {
    if (!selectedItem) return alert("Select an item.");
    if (!selectedLocation) return alert("Select a location.");
    if (qty <= 0) return alert("Quantity must be > 0");

    const soItem = items.find((it) => it.id === selectedItem);
    if (!soItem) return alert("Invalid item.");

    const remaining = soItem.quantity - soItem.shippedQty;
    if (qty > remaining) {
      return alert(`Quantity exceeds remaining on sales order (${remaining}).`);
    }

    const productId = soItem.product.id;
    const available = getAvailableFor(productId, selectedLocation);

    if (available <= 0) {
      return alert("This location has no stock for the selected item.");
    }

    if (qty > available) {
      return alert(
        `Quantity exceeds available stock at this location (${available}).`
      );
    }

    await api(`/shipment/${id}/line`, {
      method: "POST",
      body: JSON.stringify({
        salesOrderItemId: selectedItem,
        quantity: qty,
        fromLocationId: selectedLocation,
      }),
    });

    await loadShipmentAndSo();
    await loadInventory(); // refresh inventory after stock moves
    setQty(1);
  }

  async function ship() {
    if (!confirm("Ship this shipment?")) return;
    setActing(true);
    try {
      await api(`/shipment/${id}/ship`, { method: "POST" });
      await loadShipmentAndSo();
    } catch {
      alert("Failed to ship.");
    }
    setActing(false);
  }

  async function deliver() {
    if (!confirm("Mark shipment as delivered?")) return;
    setActing(true);
    try {
      await api(`/shipment/${id}/deliver`, { method: "POST" });
      await loadShipmentAndSo();
    } catch {
      alert("Failed to deliver.");
    }
    setActing(false);
  }

  async function cancel() {
    if (!confirm("Cancel shipment?")) return;
    setActing(true);
    try {
      await api(`/shipment/${id}/cancel`, { method: "POST" });
      router.push("/shipments");
    } catch {
      alert("Failed to cancel.");
    }
    setActing(false);
  }

  if (loading) {
    return <DashboardShell>Loading...</DashboardShell>;
  }

  if (!shipment || !salesOrder) {
    return (
      <DashboardShell>
        <p className="text-sm text-red-400">Shipment not found.</p>
      </DashboardShell>
    );
  }

  // ==========================
  // RENDER
  // ==========================

  return (
    <DashboardShell>
      <div className="space-y-10">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/shipments")}
            className="p-2 hover:bg-[#1a1b1f] rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl font-mono tracking-widest text-white">
              {shipment.shipmentNumber}
            </h1>
            <p className="text-xs font-mono text-gray-500 tracking-widest">
              SALES ORDER: {salesOrder.orderNumber}
            </p>
          </div>

          <Badge className="ml-3" color={shipmentStatusColor(shipment.status)}>
            {shipment.status}
          </Badge>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 flex-wrap">
          {isDraft && (
            <button
              onClick={ship}
              disabled={acting}
              className="
                bg-white text-black px-4 py-2 rounded-lg font-mono 
                text-xs tracking-widest font-semibold flex items-center gap-2
                hover:bg-gray-200 transition disabled:opacity-50
              "
            >
              <Truck size={14} /> SHIP
            </button>
          )}

          {isInTransit && (
            <button
              onClick={deliver}
              disabled={acting}
              className="
                bg-white text-black px-4 py-2 rounded-lg font-mono 
                text-xs tracking-widest font-semibold flex items-center gap-2
                hover:bg-gray-200 transition disabled:opacity-50
              "
            >
              <CheckCircle2 size={14} /> DELIVER
            </button>
          )}

          {(isDraft || isInTransit) && (
            <button
              onClick={cancel}
              disabled={acting}
              className="
                bg-red-500 text-white px-4 py-2 rounded-lg font-mono 
                text-xs tracking-widest font-semibold flex items-center gap-2
                hover:bg-red-600 transition disabled:opacity-50
              "
            >
              <XCircle size={14} /> CANCEL
            </button>
          )}
        </div>

        {/* ADD LINE (DRAFT ONLY) */}
        {isDraft && (
          <Card className="p-6 bg-[#0e0f12] border border-[#1c1d22] rounded-xl space-y-6">
            <h2 className="text-sm font-mono tracking-wide text-white">
              ADD SHIPMENT LINE
            </h2>

            {/* ITEM */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-mono tracking-wide">
                ITEM
              </label>
              <select
                value={selectedItem}
                onChange={(e) => handleSelectItem(e.target.value)}
                className="
                  w-full bg-[#111217] border border-[#23252e]
                  px-3 py-2 rounded-lg text-sm font-mono tracking-wide
                "
              >
                <option value="">-- Select Item --</option>
                {items.map((it) => {
                  const remaining = it.quantity - it.shippedQty;
                  if (remaining <= 0) return null;
                  return (
                    <option key={it.id} value={it.id}>
                      {it.product.name} (remain {remaining})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SECTION & LOCATION */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono tracking-wide">
                  SECTION
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => handleSelectSection(e.target.value)}
                  className="
                    w-full bg-[#111217] border border-[#23252e]
                    px-3 py-2 rounded-lg text-sm font-mono tracking-wide
                  "
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono tracking-wide">
                  LOCATION
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  disabled={!selectedSection}
                  className="
                    w-full bg-[#111217] border border-[#23252e]
                    px-3 py-2 rounded-lg text-sm font-mono tracking-wide
                  "
                >
                  <option value="">
                    {selectedSection
                      ? "Select Location"
                      : "Select section first"}
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} {loc.type ? `(${loc.type})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* QTY */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-mono tracking-wide">
                QUANTITY
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="
                  w-full bg-[#111217] border border-[#23252e]
                  px-3 py-2 rounded-lg text-sm font-mono tracking-wide
                "
              />
            </div>

            {/* ADD BUTTON */}
            <button
              onClick={addLine}
              className="
                bg-white text-black px-4 py-2 rounded-lg 
                font-mono text-xs tracking-widest font-semibold
                flex items-center gap-2 hover:bg-gray-200 transition
              "
            >
              <Plus size={14} /> ADD LINE
            </button>
          </Card>
        )}

        {/* SHIPMENT LINES */}
        <Card className="p-6 bg-[#0e0f12] border border-[#1c1d22] rounded-xl">
          <h2 className="text-sm font-mono tracking-wide text-white mb-4">
            SHIPMENT LINES
          </h2>

          {shipment.lines.length === 0 ? (
            <p className="text-xs text-gray-500 font-mono">
              No shipment lines yet.
            </p>
          ) : (
            <div className="space-y-2">
              {shipment.lines.map((l: any) => (
                <div
                  key={l.id}
                  className="
                    p-4 rounded-lg border border-[#23252e] bg-[#15171e]
                    hover:bg-[#1c1d22] transition
                  "
                >
                  <p className="font-mono text-sm font-semibold">
                    {l.product.name}
                  </p>

                  <p className="text-xs text-gray-400 font-mono">
                    Quantity: {l.quantity}
                  </p>

                  <p className="text-xs text-gray-400 font-mono">
                    From: {l.fromLocation.code} ({l.fromLocation.type})
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
