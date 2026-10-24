import { Button } from "@sojourn/ui/components/button";
import { useEffect, useRef } from "react";

/** Minimal modal built on <dialog>, square-edged like the rest of the UI. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] border border-border bg-card p-0 text-card-foreground backdrop:bg-black/50"
    >
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-lg">{title}</h2>
      </div>
      <div className="space-y-2 px-5 py-4 text-sm">{children}</div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
