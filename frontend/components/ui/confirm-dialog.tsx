"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/button";

export type ConfirmTone = "default" | "danger";

export interface ConfirmOptions {
  /** Short, plain-language question. e.g. "Move 20 units to LOC-A?" */
  title: string;
  /** What changes and whether it can be undone. Plain language. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" colors the confirm button red for irreversible/destructive actions. */
  tone?: ConfirmTone;
  /**
   * Optional async action run when the user confirms. If provided, the dialog
   * shows a spinner and stays open until it resolves; a thrown error keeps the
   * dialog open and shows the message so the user can retry or cancel.
   */
  onConfirm?: () => void | Promise<void>;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface DialogState extends ConfirmOptions {
  open: boolean;
}

const EMPTY: DialogState = { open: false, title: "" };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setError(null);
    setSubmitting(false);
    setState({ ...opts, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setState(EMPTY);
    setSubmitting(false);
    setError(null);
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state.onConfirm) {
      setSubmitting(true);
      setError(null);
      try {
        await state.onConfirm();
        close(true);
      } catch (e: unknown) {
        setSubmitting(false);
        setError(
          e instanceof Error && e.message
            ? e.message
            : "Something went wrong. Please try again.",
        );
      }
    } else {
      close(true);
    }
  }, [state, close]);

  const danger = state.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !submitting && close(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              {danger && (
                <span className="mt-0.5 shrink-0 text-[var(--danger)]">
                  <AlertTriangle size={22} />
                </span>
              )}
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[var(--card-foreground)]">
                  {state.title}
                </h2>
                {state.description && (
                  <div className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {state.description}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="banner-base banner-error mt-4">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => close(false)}
                disabled={submitting}
              >
                {state.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting
                  ? "Working…"
                  : (state.confirmLabel ?? "Confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
