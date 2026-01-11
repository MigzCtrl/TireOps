'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Customer } from '@/types/database';

interface EditCustomerDialogProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: () => void;
  onInputChange: (field: keyof Customer, value: string) => void;
}

export function EditCustomerDialog({
  isOpen,
  customer,
  onClose,
  onSave,
  onInputChange,
}: EditCustomerDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={customer.name || ''}
              onChange={(e) => onInputChange('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={customer.email || ''}
              onChange={(e) => onInputChange('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone *</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={customer.phone || ''}
              onChange={(e) => onInputChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              value={customer.address || ''}
              onChange={(e) => onInputChange('address', e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
