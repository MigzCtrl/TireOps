'use client';

import { Car } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Vehicle } from '@/types/database';

interface VehicleFormData {
  year: string;
  make: string;
  model: string;
  trim: string;
  recommended_tire_size: string;
  notes: string;
}

interface VehicleFormDialogProps {
  isOpen: boolean;
  editingVehicle: Vehicle | null;
  vehicleForm: VehicleFormData;
  suggestedSizes: string[];
  onClose: () => void;
  onSave: () => void;
  onFormChange: (field: string, value: string) => void;
}

export function VehicleFormDialog({
  isOpen,
  editingVehicle,
  vehicleForm,
  suggestedSizes,
  onClose,
  onSave,
  onFormChange,
}: VehicleFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-500/20">
              <Car size={20} className="text-orange-400" />
            </div>
            {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          </DialogTitle>
          <DialogDescription>
            {editingVehicle ? 'Update vehicle information.' : 'Add a new vehicle for this customer.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-year">Year *</Label>
              <Input
                id="vehicle-year"
                type="number"
                min="1900"
                max="2030"
                placeholder="2024"
                value={vehicleForm.year}
                onChange={(e) => onFormChange('year', e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-3">
              <Label htmlFor="vehicle-make">Make *</Label>
              <Input
                id="vehicle-make"
                placeholder="Toyota, Ford, Honda..."
                value={vehicleForm.make}
                onChange={(e) => onFormChange('make', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-model">Model *</Label>
              <Input
                id="vehicle-model"
                placeholder="Camry, F-150, Civic..."
                value={vehicleForm.model}
                onChange={(e) => onFormChange('model', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-trim">Trim (Optional)</Label>
              <Input
                id="vehicle-trim"
                placeholder="SE, XLE, Sport..."
                value={vehicleForm.trim}
                onChange={(e) => onFormChange('trim', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-tire-size">Recommended Tire Size</Label>
            <Input
              id="vehicle-tire-size"
              placeholder="225/45R17"
              value={vehicleForm.recommended_tire_size}
              onChange={(e) => onFormChange('recommended_tire_size', e.target.value)}
            />
            {suggestedSizes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-text-muted mb-2">Suggested sizes for this vehicle type:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onFormChange('recommended_tire_size', size)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        vehicleForm.recommended_tire_size === size
                          ? 'bg-success/20 border-success text-success'
                          : 'bg-bg-light border-border-muted text-text-muted hover:border-primary hover:text-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-notes">Notes (Optional)</Label>
            <Input
              id="vehicle-notes"
              placeholder="Any additional notes about this vehicle..."
              value={vehicleForm.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
