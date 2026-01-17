'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, RotateCcw, Settings2, Radio, Receipt, Shield,
  Plus, Minus, Check, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';
import { ShopService, ServiceCategory, ServicePriceType } from '@/types/database';

const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; icon: React.ElementType; color: string }> = {
  installation: { label: 'Installation', icon: Wrench, color: 'text-primary' },
  maintenance: { label: 'Maintenance', icon: RotateCcw, color: 'text-info' },
  repair: { label: 'Repair', icon: Settings2, color: 'text-warning' },
  tpms: { label: 'TPMS', icon: Radio, color: 'text-success' },
  fees: { label: 'Fees', icon: Receipt, color: 'text-text-muted' },
  protection: { label: 'Protection', icon: Shield, color: 'text-purple-400' },
};

export interface SelectedService {
  service: ShopService;
  quantity: number;
}

interface ServiceSelectorProps {
  services: ShopService[];
  selectedServices: SelectedService[];
  onServicesChange: (services: SelectedService[]) => void;
  tireCount: number; // Number of tires in the order (for per-tire pricing)
  loading?: boolean;
}

export default function ServiceSelector({
  services,
  selectedServices,
  onServicesChange,
  tireCount,
  loading = false,
}: ServiceSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<ServiceCategory>>(
    new Set(['installation', 'maintenance'])
  );

  // Group active services by category
  const servicesByCategory = useMemo(() => {
    const activeServices = services.filter(s => s.is_active);
    return activeServices.reduce((acc, service) => {
      const cat = service.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {} as Record<ServiceCategory, ShopService[]>);
  }, [services]);

  // Get selected service IDs for quick lookup
  const selectedIds = useMemo(() =>
    new Set(selectedServices.map(s => s.service.id)),
    [selectedServices]
  );

  // Toggle category expansion
  const toggleCategory = (category: ServiceCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Toggle service selection
  const toggleService = (service: ShopService) => {
    if (selectedIds.has(service.id)) {
      // Remove service
      onServicesChange(selectedServices.filter(s => s.service.id !== service.id));
    } else {
      // Add service with appropriate quantity
      const quantity = service.price_type === 'flat' ? 1 : Math.max(1, tireCount);
      onServicesChange([...selectedServices, { service, quantity }]);
    }
  };

  // Update service quantity
  const updateQuantity = (serviceId: string, delta: number) => {
    onServicesChange(selectedServices.map(s => {
      if (s.service.id === serviceId) {
        const newQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: newQty };
      }
      return s;
    }));
  };

  // Auto-update quantities when tire count changes (for per-tire services)
  useEffect(() => {
    if (tireCount > 0) {
      const updated = selectedServices.map(s => {
        if (s.service.price_type === 'per_tire') {
          return { ...s, quantity: tireCount };
        }
        return s;
      });
      // Only update if something changed
      const hasChanges = updated.some((s, i) => s.quantity !== selectedServices[i].quantity);
      if (hasChanges) {
        onServicesChange(updated);
      }
    }
  }, [tireCount]);

  // Calculate subtotal for a service
  const getSubtotal = (service: ShopService, quantity: number): number => {
    return service.price * quantity;
  };

  // Get price label
  const getPriceLabel = (service: ShopService): string => {
    switch (service.price_type) {
      case 'per_tire': return '/ tire';
      case 'per_unit': return '/ unit';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-text-muted">Loading services...</span>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 px-4 rounded-lg bg-bg-light border border-border-muted">
        <Settings2 className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">No services configured</p>
        <p className="text-xs text-text-muted mt-1">
          Add services in Settings → Services
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wide">
          Services
        </h3>
        {selectedServices.length > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {selectedServices.length} selected
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {(Object.keys(CATEGORY_CONFIG) as ServiceCategory[]).map(category => {
          const config = CATEGORY_CONFIG[category];
          const categoryServices = servicesByCategory[category] || [];
          if (categoryServices.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const Icon = config.icon;
          const selectedInCategory = categoryServices.filter(s => selectedIds.has(s.id)).length;

          return (
            <div key={category} className="rounded-lg border border-border-muted overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full px-3 py-2 flex items-center justify-between bg-bg-light hover:bg-bg-light/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={config.color} />
                  <span className="text-sm font-medium text-text">{config.label}</span>
                  {selectedInCategory > 0 && (
                    <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">
                      {selectedInCategory}
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-text-muted" />
                ) : (
                  <ChevronRight size={14} className="text-text-muted" />
                )}
              </button>

              {/* Services list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-border-muted/30">
                      {categoryServices.sort((a, b) => a.sort_order - b.sort_order).map(service => {
                        const isSelected = selectedIds.has(service.id);
                        const selectedService = selectedServices.find(s => s.service.id === service.id);
                        const quantity = selectedService?.quantity || (service.price_type === 'flat' ? 1 : tireCount || 1);

                        return (
                          <div
                            key={service.id}
                            className={`px-3 py-2 transition-colors ${
                              isSelected ? 'bg-primary/5' : 'bg-bg hover:bg-bg-light/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* Checkbox + Name */}
                              <button
                                type="button"
                                onClick={() => toggleService(service)}
                                className="flex items-center gap-2 min-w-0 flex-1"
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-border-muted hover:border-primary/50'
                                }`}>
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <div className="text-left min-w-0">
                                  <span className={`text-sm block truncate ${isSelected ? 'text-text font-medium' : 'text-text'}`}>
                                    {service.name}
                                  </span>
                                </div>
                              </button>

                              {/* Price + Quantity */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isSelected && service.price_type !== 'flat' && (
                                  <div className="flex items-center gap-1 bg-bg-light rounded-lg px-1">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); updateQuantity(service.id, -1); }}
                                      className="p-0.5 rounded hover:bg-bg transition-colors"
                                      disabled={quantity <= 1}
                                    >
                                      <Minus size={12} className="text-text-muted" />
                                    </button>
                                    <span className="text-xs font-medium text-text w-5 text-center">
                                      {quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); updateQuantity(service.id, 1); }}
                                      className="p-0.5 rounded hover:bg-bg transition-colors"
                                    >
                                      <Plus size={12} className="text-text-muted" />
                                    </button>
                                  </div>
                                )}
                                <div className="text-right min-w-[70px]">
                                  {isSelected ? (
                                    <span className="text-sm font-semibold text-primary">
                                      ${getSubtotal(service, quantity).toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-text-muted">
                                      ${service.price.toFixed(2)}
                                      <span className="ml-0.5">{getPriceLabel(service)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Selected services summary */}
      {selectedServices.length > 0 && (
        <div className="pt-2 border-t border-border-muted">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Services subtotal</span>
            <span className="font-semibold text-text">
              ${selectedServices.reduce((sum, s) => sum + getSubtotal(s.service, s.quantity), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
