'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import DateTimePicker from '@/components/DateTimePicker';
import TireSelector, { type SelectedTire } from '@/components/TireSelector';
import ServiceSelector, { type SelectedService } from '@/components/ServiceSelector';
import { ShopService } from '@/types/database';

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
  services: ShopService[];
  selectedTires: SelectedTire[];
  onSelectedTiresChange: (tires: SelectedTire[]) => void;
  selectedServices: SelectedService[];
  onSelectedServicesChange: (services: SelectedService[]) => void;
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
  services,
  selectedTires,
  onSelectedTiresChange,
  selectedServices,
  onSelectedServicesChange,
  stockError,
  onStockError,
  taxRate,
  onSubmit,
  onCancel,
  onInventoryUpdate,
}: WorkOrderFormProps) {
  // Calculate tire count for service quantity
  const tireCount = selectedTires.reduce((sum, st) => sum + st.quantity, 0);

  const calculateTotal = () => {
    // Tires subtotal
    const tiresSubtotal = selectedTires.reduce((sum, st) => sum + (st.quantity * st.tire.price), 0);

    // Services subtotals (taxable and non-taxable)
    let servicesSubtotal = 0;
    let taxableServicesSubtotal = 0;
    for (const ss of selectedServices) {
      const amount = ss.service.price * ss.quantity;
      servicesSubtotal += amount;
      if (ss.service.is_taxable) {
        taxableServicesSubtotal += amount;
      }
    }

    // Tax calculation
    const taxableAmount = tiresSubtotal + taxableServicesSubtotal;
    const tax = taxableAmount * (taxRate / 100);

    const subtotal = tiresSubtotal + servicesSubtotal;
    const total = subtotal + tax;

    return { subtotal, tiresSubtotal, servicesSubtotal, tax, taxRate, total };
  };

  const totals = calculateTotal();
  const hasItems = selectedTires.length > 0 || selectedServices.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Edit Work Order' : 'New Work Order'}
          </DialogTitle>
          <DialogDescription>
            {editingId ? 'Update the work order details below.' : 'Create a new work order for a customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              {/* Customer & Schedule */}
              <div>
                <h3 className="text-sm font-semibold text-text uppercase tracking-wide mb-4">
                  Customer & Schedule
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

                  <DateTimePicker
                    date={formData.scheduled_date}
                    time={formData.scheduled_time}
                    onDateChange={(date) => onFormDataChange({ ...formData, scheduled_date: date })}
                    onTimeChange={(time) => onFormDataChange({ ...formData, scheduled_time: time })}
                    label="Appointment"
                  />
                </div>
              </div>

              {/* Services Selection */}
              <ServiceSelector
                services={services}
                selectedServices={selectedServices}
                onServicesChange={onSelectedServicesChange}
                tireCount={tireCount}
              />

              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions..."
                  className="w-full h-20 px-3 py-2 rounded-lg border border-border-muted bg-bg-light text-text text-sm focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent transition-shadow resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Middle Column - Tire Selection */}
            <div className="lg:col-span-2">
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

          {/* Order Summary */}
          {hasItems && (
            <div className="p-4 rounded-xl bg-bg-light border border-border-muted">
              <h4 className="text-sm font-semibold text-text mb-4">Order Summary</h4>

              {/* Line items breakdown */}
              <div className="space-y-3 mb-4">
                {/* Tires */}
                {selectedTires.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Tires</p>
                    {selectedTires.map((st, idx) => (
                      <div key={idx} className="flex justify-between text-sm pl-2">
                        <span className="text-text">
                          {st.tire.brand} {st.tire.model} × {st.quantity}
                        </span>
                        <span className="text-text">${(st.tire.price * st.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Services */}
                {selectedServices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Services</p>
                    {selectedServices.map((ss, idx) => (
                      <div key={idx} className="flex justify-between text-sm pl-2">
                        <span className="text-text">
                          {ss.service.name}
                          {ss.service.price_type !== 'flat' && ` × ${ss.quantity}`}
                        </span>
                        <span className="text-text">${(ss.service.price * ss.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-3 border-t border-border-muted">
                {totals.tiresSubtotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Tires</span>
                    <span className="text-text">${totals.tiresSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {totals.servicesSubtotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Services</span>
                    <span className="text-text">${totals.servicesSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Tax ({taxRate}%)</span>
                    <span className="text-text">${totals.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border-muted">
                  <span className="text-text">Total</span>
                  <span className="text-primary">${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-muted">
            <button
              type="button"
              onClick={onCancel}
              className="sm:flex-1 px-4 py-2.5 rounded-lg bg-bg-light text-text-muted hover:bg-danger/10 hover:text-danger border border-transparent hover:border-danger/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.customer_id || !formData.scheduled_date}
              className="sm:flex-1 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingId ? 'Update Work Order' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
