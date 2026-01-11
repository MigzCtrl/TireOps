'use client';

import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Customer } from '@/types/database';

interface DeleteCustomerDialogProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteCustomerDialog({
  isOpen,
  customer,
  onClose,
  onConfirm,
}: DeleteCustomerDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
              <Trash2 size={20} className="text-red-600 dark:text-red-400" />
            </div>
            Delete Customer?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. This will permanently delete{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{customer.name}</span>{' '}
            and all associated data.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex-1"
            >
              Delete Customer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
