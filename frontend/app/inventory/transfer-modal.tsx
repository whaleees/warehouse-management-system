"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";

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

export default function TransferModal({ inv, onClose, onSuccess }: TransferModalProps) {
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

  async function submit() {
    if (!selectedLocation) return alert("Select destination location");
    if (qty <= 0) return alert("Invalid quantity");

    await api("/movement", {
      method: "POST",
      body: JSON.stringify({
        type: "TRANSFER",
        productId: inv.productId,
        batchId: inv.batchId,
        quantity: qty,
        fromLocationId: inv.locationId,
        toLocationId: selectedLocation,
      }),
    });

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card
        className="
          w-[460px] p-8 rounded-xl
          bg-[#0e0f12] border border-[#1c1d22]
          shadow-xl space-y-6
        "
      >
        {/* HEADER */}
        <div>
          <h1 className="text-lg font-mono tracking-widest text-white mb-1">
            TRANSFER INVENTORY
          </h1>
          <p className="text-xs font-mono text-gray-500 tracking-widest">
            MOVE STOCK BETWEEN LOCATIONS
          </p>
        </div>

        {/* DETAILS BOX */}
        <div className="bg-[#111217] border border-[#1c1d22] rounded-lg p-4 text-sm font-mono space-y-1">
          <p>PRODUCT: <span className="text-gray-300">{inv.product.name}</span></p>
          <p>BATCH: <span className="text-gray-300">{inv.batch.code}</span></p>
          <p>FROM LOCATION: <span className="text-gray-300">{inv.location.code}</span></p>
          <p className="text-gray-500 text-xs mt-1">
            AVAILABLE: {inv.quantity}
          </p>
        </div>

        {/* SECTION SELECT */}
        <Field label="TO SECTION">
          <select
            value={selectedSection}
            onChange={async (e) => {
              setSelectedSection(e.target.value);
              setSelectedLocation("");
              setLocations([]);
              if (e.target.value) await loadLocations(e.target.value);
            }}
            className="input-style text-xs"
          >
            <option value="">Select Section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </Field>

        {/* LOCATION SELECT */}
        <Field label="TO LOCATION">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={!selectedSection}
            className={`input-style text-xs ${
              !selectedSection ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Select Location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
        </Field>

        {/* QUANTITY */}
        <Field label="QUANTITY">
          <input
            type="number"
            min={1}
            max={inv.quantity}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="input-style text-xs"
          />
        </Field>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="
              px-4 py-2 text-xs font-mono tracking-widest
              border border-red-500 text-red-400 rounded-lg
              hover:bg-red-500 hover:text-black transition
            "
          >
            CANCEL
          </button>

          <button
            onClick={submit}
            className="
              px-4 py-2 text-xs font-mono tracking-widest
              bg-white text-black rounded-lg
              hover:bg-gray-200 transition
            "
          >
            CONFIRM TRANSFER
          </button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="flex flex-col gap-1 font-mono">
      <span className="text-[11px] tracking-widest text-gray-400">{label}</span>
      {children}
    </div>
  );
}
