"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import Input from "@/components/ui/input";
import LoadingState from "@/components/ui/loading-state";
import ErrorState from "@/components/ui/error-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { useRole } from "@/lib/roles";

import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  XCircle,
  Plus,
  MapPin,
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
  description?: string;
}

interface Location {
  id: string;
  code: string;
  type: string;
}

export default function ShipmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();

  const [shipment, setShipment] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState(1);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

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

  const selectedSoItem = items.find((it) => it.id === selectedItem);
  const remainingForSelected = selectedSoItem
    ? selectedSoItem.quantity - selectedSoItem.shippedQty
    : 0;
  const availableForSelected =
    selectedSoItem && selectedLocation
      ? getAvailableFor(selectedSoItem.product.id, selectedLocation)
      : 0;
  // Most you can add: limited by what's left on the order and stock on hand.
  const maxQty =
    selectedSoItem && selectedLocation
      ? Math.max(0, Math.min(remainingForSelected, availableForSelected))
      : remainingForSelected;

  function clampQty(n: number) {
    const cap = maxQty > 0 ? maxQty : 1;
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(Math.floor(n), cap));
  }

  function handleSelectItem(value: string) {
    setSelectedItem(value); // item independent from section/location
    setAddError("");
    setQty(1);
  }

  async function handleSelectSection(sectionId: string) {
    setSelectedSection(sectionId);
    setSelectedLocation("");
    setLocations([]);
    setAddError("");

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
    setAddError("");

    if (!selectedItem) {
      setAddError("Choose an item to ship.");
      return;
    }
    if (!selectedLocation) {
      setAddError("Choose where the stock is coming from.");
      return;
    }

    const soItem = selectedSoItem;
    if (!soItem) {
      setAddError("That item is no longer available. Pick another.");
      return;
    }

    const remaining = soItem.quantity - soItem.shippedQty;
    const available = getAvailableFor(soItem.product.id, selectedLocation);

    if (available <= 0) {
      setAddError("This location has no stock for the selected item.");
      return;
    }

    const amount = clampQty(qty);
    if (amount <= 0) {
      setAddError("Nothing left to add for this item.");
      return;
    }
    if (amount > remaining) {
      setAddError(`Only ${remaining} left to ship on this order.`);
      return;
    }
    if (amount > available) {
      setAddError(`Only ${available} in stock at this location.`);
      return;
    }

    setAdding(true);
    try {
      await api(`/shipment/${id}/line`, {
        method: "POST",
        body: JSON.stringify({
          salesOrderItemId: selectedItem,
          quantity: amount,
          fromLocationId: selectedLocation,
        }),
      });

      await loadShipmentAndSo();
      await loadInventory(); // refresh inventory after stock moves
      setQty(1);
      toast.success(`Added ${amount} ${soItem.product.name} to the shipment.`);
    } catch {
      toast.error(
        "Couldn't add that item. Check the quantity and stock, then try again.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function ship() {
    const ok = await confirm({
      title: "Ship this order?",
      description:
        "Stock will leave the warehouse and the shipment moves to in transit. This can't be undone.",
      confirmLabel: "Ship order",
      onConfirm: async () => {
        try {
          await api(`/shipment/${id}/ship`, { method: "POST" });
        } catch {
          throw new Error("Couldn't ship the order. Please try again.");
        }
      },
    });
    if (ok) {
      await loadShipmentAndSo();
      toast.success("Shipment is on its way.");
    }
  }

  async function deliver() {
    const ok = await confirm({
      title: "Mark as delivered?",
      description:
        "This records the order as received by the customer. This can't be undone.",
      confirmLabel: "Mark delivered",
      onConfirm: async () => {
        try {
          await api(`/shipment/${id}/deliver`, { method: "POST" });
        } catch {
          throw new Error("Couldn't update the shipment. Please try again.");
        }
      },
    });
    if (ok) {
      await loadShipmentAndSo();
      toast.success("Shipment marked as delivered.");
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: "Cancel this shipment?",
      description:
        "Any stock already picked is returned and the shipment is closed. This can't be undone.",
      confirmLabel: "Cancel shipment",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/shipment/${id}/cancel`, { method: "POST" });
        } catch {
          throw new Error("Couldn't cancel the shipment. Please try again.");
        }
      },
    });
    if (ok) {
      toast.success("Shipment cancelled.");
      router.push("/shipments");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading shipment…" />
      </DashboardShell>
    );
  }

  if (!shipment || !salesOrder) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <ErrorState message="We couldn't find that shipment." />
          <Button variant="outline" onClick={() => router.push("/shipments")}>
            Back to shipments
          </Button>
        </div>
      </DashboardShell>
    );
  }

  // ==========================
  // RENDER
  // ==========================

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/shipments")}
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
            aria-label="Back to shipments"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {shipment.shipmentNumber}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Sales order {salesOrder.orderNumber}
              {salesOrder.customer?.name
                ? ` · ${salesOrder.customer.name}`
                : ""}
            </p>
          </div>

          <StatusBadge kind="shipment" status={shipment.status} />
        </div>

        {/* Action buttons */}
        {(isDraft || isInTransit) && (
          <div className="flex flex-wrap gap-3">
            {isDraft && can("manage:business") && (
              <Button onClick={ship}>
                <Truck size={16} />
                Ship order
              </Button>
            )}

            {isInTransit && can("manage:business") && (
              <Button variant="success" onClick={deliver}>
                <CheckCircle2 size={16} />
                Mark delivered
              </Button>
            )}

            {can("manage:business") && (
              <Button variant="danger" onClick={cancel}>
                <XCircle size={16} />
                Cancel shipment
              </Button>
            )}
          </div>
        )}

        {/* Add line (draft only) */}
        {isDraft && (
          <Card className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--card-foreground)]">
                Add items to ship
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Pick the product, where it's stored, and how many you're
                sending.
              </p>
            </div>

            {/* Item */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ship-item"
                className="text-sm font-medium text-[var(--foreground)]"
              >
                Item
              </label>
              <select
                id="ship-item"
                value={selectedItem}
                onChange={(e) => handleSelectItem(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Choose an item</option>
                {items.map((it) => {
                  const remaining = it.quantity - it.shippedQty;
                  if (remaining <= 0) return null;
                  return (
                    <option key={it.id} value={it.id}>
                      {it.product.name} ({remaining} left to ship)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Section & location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ship-section"
                  className="text-sm font-medium text-[var(--foreground)]"
                >
                  Section
                </label>
                <select
                  id="ship-section"
                  value={selectedSection}
                  onChange={(e) => handleSelectSection(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ship-location"
                  className="text-sm font-medium text-[var(--foreground)]"
                >
                  Location
                </label>
                <select
                  id="ship-location"
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setAddError("");
                  }}
                  disabled={!selectedSection}
                  className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {selectedSection
                      ? "Choose a location"
                      : "Choose a section first"}
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code}
                      {loc.type ? ` — ${loc.type.toLowerCase()}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quantity */}
            <Input
              type="number"
              label="Quantity"
              min={1}
              max={maxQty > 0 ? maxQty : undefined}
              value={qty}
              onChange={(e) => setQty(clampQty(Number(e.target.value)))}
              hint={
                selectedItem && selectedLocation
                  ? `Up to ${maxQty} (order has ${remainingForSelected} left, ${availableForSelected} in stock here).`
                  : "Pick an item and location to see the limit."
              }
              error={addError || undefined}
            />

            <div className="flex justify-end">
              {can("manage:business") && (
                <Button onClick={addLine} loading={adding}>
                  <Plus size={16} />
                  Add to shipment
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Shipment lines */}
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--card-foreground)]">
            Items in this shipment
          </h2>

          {shipment.lines.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {isDraft
                ? "No items added yet. Use Add items to ship above to pick what's going out."
                : "This shipment has no items."}
            </p>
          ) : (
            <div className="space-y-2">
              {shipment.lines.map((l: any) => (
                <div
                  key={l.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {l.product.name}
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Quantity: {l.quantity}
                  </p>

                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                    <MapPin size={14} />
                    From {l.fromLocation.code}
                    {l.fromLocation.type
                      ? ` (${l.fromLocation.type.toLowerCase()})`
                      : ""}
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
