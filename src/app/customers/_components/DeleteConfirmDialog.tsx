'use client';

import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Customer } from '@/types/database';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  customer,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-danger/20">
              <Trash2 size={20} className="text-danger" />
            </div>
            Delete Customer?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete <span className="font-semibold text-text">{customer.name}</span>?
            This action cannot be undone and will permanently remove all associated data.
          </p>

          {(customer.order_count || 0) > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-sm text-warning">
                <strong>Warning:</strong> This customer has {customer.order_count} order(s). Deleting them may affect work order records.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
