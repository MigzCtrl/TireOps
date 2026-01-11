'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import DateTimePicker from '@/components/DateTimePicker';
import TireSelector, { type SelectedTire } from '@/components/TireSelector';

interface CustomerBasic {
  id: string;
  name: string;
}

interface TireBasic {
  id: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
}

interface FormData {
  customer_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  status: string;
}

interface WorkOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  customers: CustomerBasic[];
  tires: TireBasic[];
  selectedTires: SelectedTire[];
  onSelectedTiresChange: (tires: SelectedTire[]) => void;
  stockError: string;
  onStockError: (message: string) => void;
  taxRate: number;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onInventoryUpdate: (tireId: string, quantityChange: number) => Promise<void>;
}

export function WorkOrderForm({
  open,
  onOpenChange,
  editingId,
  formData,
  onFormDataChange,
  customers,
  tires,
  selectedTires,
  onSelectedTiresChange,
  stockError,
  onStockError,
  taxRate,
  onSubmit,
  onCancel,
  onInventoryUpdate,
}: WorkOrderFormProps) {
  const calculateTotal = () => {
    const subtotal = selectedTires.reduce((sum, st) => sum + (st.quantity * st.tire.price), 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, taxRate, total };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Edit Work Order' : 'New Work Order'}
          </DialogTitle>
          <DialogDescription>
            {editingId ? 'Update the work order details below.' : 'Create a new work order for a customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Info Section */}
              <div>
                <h3 className="text-sm font-semibold text-text uppercase tracking-wide mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer *</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) => onFormDataChange({ ...formData, customer_id: value })}
                    >
                      <SelectTrigger id="customer">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_type">Service Type *</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value) => onFormDataChange({ ...formData, service_type: value })}
                    >
                      <SelectTrigger id="service_type">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tire Installation">Tire Installation</SelectItem>
                        <SelectItem value="Tire Rotation">Tire Rotation</SelectItem>
                        <SelectItem value="Tire Repair">Tire Repair</SelectItem>
                        <SelectItem value="Wheel Alignment">Wheel Alignment</SelectItem>
                        <SelectItem value="Tire Balance">Tire Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div>
                <DateTimePicker
                  date={formData.scheduled_date}
                  time={formData.scheduled_time}
                  onDateChange={(date) => onFormDataChange({ ...formData, scheduled_date: date })}
                  onTimeChange={(time) => onFormDataChange({ ...formData, scheduled_time: time })}
                  label="Schedule Appointment"
                />
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
                  placeholder="Add any special instructions or notes..."
                  className="w-full h-24 px-3 py-2 rounded-lg border border-border-muted bg-bg-light text-text text-sm focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent transition-shadow resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Tire Selection */}
            <div>
              <AnimatePresence>
                {stockError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30"
                  >
                    <p className="text-sm font-medium text-danger">{stockError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <TireSelector
                tires={tires}
                selectedTires={selectedTires}
                onTiresChange={onSelectedTiresChange}
                customerTireSize=""
                onStockError={(message) => {
                  onStockError(message);
                  setTimeout(() => onStockError(''), 5000);
                }}
                onInventoryUpdate={onInventoryUpdate}
              />
            </div>
          </div>

          {/* Order Summary with Tax */}
          {selectedTires.length > 0 && (
            <div className="p-4 rounded-lg bg-bg-light border border-border-muted">
              <h4 className="text-sm font-semibold text-text mb-3">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="text-text">${calculateTotal().subtotal.toFixed(2)}</span>
                </div>
                {calculateTotal().taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Tax ({calculateTotal().taxRate}%)</span>
                    <span className="text-text">${calculateTotal().tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-2 border-t border-border-muted">
                  <span className="text-text">Total</span>
                  <span className="text-primary">${calculateTotal().total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-muted">
            <button
              type="button"
              onClick={onCancel}
              className="sm:flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sm:flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors"
            >
              {editingId ? 'Update Work Order' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
