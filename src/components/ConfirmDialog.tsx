"use client";

import { useState, type ReactNode } from "react";
import { FieldMessage } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatApiError } from "@/lib/format";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  warning?: string;
  acknowledgement?: string;
  confirmLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  error?: unknown;
  onConfirm: () => void;
  children?: ReactNode;
}

// Shared irreversible/state-changing action dialog: warning box + optional
// extra controls (e.g. purge/force checkboxes) + optional "I understand"
// acknowledgement gating the confirm button. Used by namespace delete,
// dataset delete, and rollback.
export function ConfirmDialog({ open, onOpenChange, ...body }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed by `open` so the acknowledgement checkbox resets on every
            open, even for callers (Datasets page) that keep this dialog
            mounted between uses instead of unmounting it on close. */}
        <ConfirmDialogBody key={open ? "open" : "closed"} onOpenChange={onOpenChange} {...body} />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialogBody({
  onOpenChange,
  title,
  description,
  warning,
  acknowledgement,
  confirmLabel,
  pendingLabel = "Working…",
  isPending = false,
  error,
  onConfirm,
  children,
}: Omit<ConfirmDialogProps, "open">) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <div className="space-y-4">
        {warning ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            {warning}
          </div>
        ) : null}

        {children}

        {acknowledgement ? (
          <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <p className="text-sm font-medium">{acknowledgement}</p>
          </label>
        ) : null}

        <FieldMessage tone="danger">{error ? formatApiError(error) : undefined}</FieldMessage>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isPending || (!!acknowledgement && !acknowledged)}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
