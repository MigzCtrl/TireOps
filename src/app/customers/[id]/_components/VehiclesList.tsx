'use client';

import { motion } from 'framer-motion';
import { Car, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Vehicle } from '@/types/database';

interface VehiclesListProps {
  vehicles: Vehicle[];
  onAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
}

export function VehiclesList({
  vehicles,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
}: VehiclesListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="card-glass p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Car className="text-orange-400" size={20} />
          </div>
          <h2 className="text-xl font-semibold dark:text-white">Vehicles</h2>
          {vehicles.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
              {vehicles.length}
            </span>
          )}
        </div>
        <Button
          onClick={onAddVehicle}
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus size={16} />
          Add Vehicle
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Car size={40} className="mx-auto mb-3 opacity-50" />
          <p>No vehicles registered yet</p>
          <p className="text-sm mt-1">Add a vehicle to track tire recommendations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-bg-light rounded-lg p-4 border border-border-muted hover:border-orange-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-text">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle.trim && (
                    <p className="text-sm text-text-muted">{vehicle.trim}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditVehicle(vehicle)}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-danger hover:text-danger"
                    onClick={() => onDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {vehicle.recommended_tire_size && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-muted">
                  <span className="text-xs text-text-muted">Recommended Tire:</span>
                  <span className="px-2 py-1 text-sm font-medium bg-success/20 text-success rounded">
                    {vehicle.recommended_tire_size}
                  </span>
                </div>
              )}

              {vehicle.notes && (
                <p className="text-sm text-text-muted mt-2">{vehicle.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
