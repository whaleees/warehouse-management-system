"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface TransferInventory {
  productId: string;
  batchId: string;
  locationId: string;
  quantity: number;
  product: { name: string };
  batch: { code: string };
  location: { code: string };
}

interface TransferOption {
  id: string;
  code: string;
}

interface TransferModalProps {
  inv: TransferInventory;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({
  inv,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [qty, setQty] = useState(1);
  const [sections, setSections] = useState<TransferOption[]>([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [locations, setLocations] = useState<TransferOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  async function loadSections() {
    const res = await api("/sections?page=1&limit=999");
    setSections(res.data ?? res);
  }

  async function loadLocations(sectionId: string) {
    const res = await api(`/sections/${sectionId}/locations?page=1&limit=999`);
    setLocations(res.data ?? res);
  }

  useEffect(() => {
    loadSections();
  }, []);

  // Keep quantity within 1..available at all times.
  const clamp = (n: number) =>
    Math.max(1, Math.min(Number.isFinite(n) ? n : 1, inv.quantity));

  async function handleTransfer() {
    if (!selectedLocation) {
      toast.error("Choose a destination location first.");
      return;
    }
    const amount = clamp(qty);
    const destCode =
      locations.find((l) => l.id === selectedLocation)?.code ??
      "the selected location";
    const unit = amount === 1 ? "unit" : "units";

    const ok = await confirm({
      title: `Move ${amount} ${unit} of ${inv.product.name}?`,
      description: (
        <>
          From <strong>{inv.location.code}</strong> to{" "}
          <strong>{destCode}</strong>. This updates stock immediately and
          can&apos;t be undone.
        </>
      ),
      confirmLabel: "Move stock",
      onConfirm: async () => {
        try {
          await api("/movement", {
            method: "POST",
            body: JSON.stringify({
              type: "TRANSFER",
              productId: inv.productId,
              batchId: inv.batchId,
              quantity: amount,
              fromLocationId: inv.locationId,
              toLocationId: selectedLocation,
            }),
          });
        } catch {
          throw new Error(
            "Couldn't move the stock. Check the amount and try again.",
          );
        }
      },
    });

    if (ok) {
      toast.success(`Moved ${amount} ${unit} to ${destCode}.`);
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--card-foreground)]">
            Transfer inventory
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Move stock from one location to another.
          </p>
        </div>

        {/* Source details */}
        <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 text-sm">
          <p className="text-[var(--foreground)]">
            <span className="text-[var(--muted-foreground)]">Product: </span>
            {inv.product.name}
          </p>
          <p className="text-[var(--foreground)]">
            <span className="text-[var(--muted-foreground)]">Batch: </span>
            {inv.batch.code}
          </p>
          <p className="text-[var(--foreground)]">
            <span className="text-[var(--muted-foreground)]">From: </span>
            {inv.location.code}
          </p>
          <p className="pt-1 text-[var(--muted-foreground)]">
            Available: <strong>{inv.quantity}</strong> units
          </p>
        </div>

        <Field label="To section">
          <select
            value={selectedSection}
            onChange={async (e) => {
              setSelectedSection(e.target.value);
              setSelectedLocation("");
              setLocations([]);
              if (e.target.value) await loadLocations(e.target.value);
            }}
            className="input-style"
          >
            <option value="">Select a section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </Field>

        <Field label="To location">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={!selectedSection}
            className="input-style"
          >
            <option value="">Select a location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Quantity (max ${inv.quantity})`}>
          <input
            type="number"
            min={1}
            max={inv.quantity}
            value={qty}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className="input-style"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleTransfer}>
            Move stock
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
    </div>
  );
}
