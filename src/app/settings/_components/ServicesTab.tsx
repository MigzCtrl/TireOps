'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Check, X, Loader2, GripVertical,
  Wrench, RotateCcw, Settings2, Radio, Receipt, Shield,
  DollarSign, AlertCircle, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ShopService, ServiceCategory, ServicePriceType } from '@/types/database';

const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; icon: React.ElementType; color: string }> = {
  installation: { label: 'Installation', icon: Wrench, color: 'text-primary' },
  maintenance: { label: 'Maintenance', icon: RotateCcw, color: 'text-info' },
  repair: { label: 'Repair', icon: Settings2, color: 'text-warning' },
  tpms: { label: 'TPMS', icon: Radio, color: 'text-success' },
  fees: { label: 'Fees', icon: Receipt, color: 'text-text-muted' },
  protection: { label: 'Protection', icon: Shield, color: 'text-purple-400' },
};

const PRICE_TYPE_LABELS: Record<ServicePriceType, string> = {
  per_tire: '/ tire',
  flat: 'flat',
  per_unit: '/ unit',
};

interface ServicesTabProps {
  isOwner: boolean;
}

export function ServicesTab({ isOwner }: ServicesTabProps) {
  const { toast } = useToast();
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<ServiceCategory>>(new Set(['installation', 'maintenance', 'repair', 'tpms', 'fees', 'protection']));
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'per_tire' as ServicePriceType,
    is_taxable: true,
    is_active: true,
    category: 'installation' as ServiceCategory,
  });

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();

      if (data.needsMigration) {
        // Initialize default services
        const initRes = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' }),
        });
        const initData = await initRes.json();
        if (initData.services) {
          setServices(initData.services);
        }
      } else {
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const cat = service.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<ServiceCategory, ShopService[]>);

  // Toggle category expansion
  const toggleCategory = (category: ServiceCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Start editing a service
  const startEdit = (service: ShopService) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      description: service.description || '',
      price: String(service.price),
      price_type: service.price_type,
      is_taxable: service.is_taxable,
      is_active: service.is_active,
      category: service.category,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setEditForm({
      name: '',
      description: '',
      price: '',
      price_type: 'per_tire',
      is_taxable: true,
      is_active: true,
      category: 'installation',
    });
  };

  // Save service (create or update)
  const saveService = async (id?: string) => {
    if (!editForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Service name is required' });
      return;
    }

    setSaving(id || 'new');
    try {
      const method = id ? 'PUT' : 'POST';
      const body = id ? { id, ...editForm, price: parseFloat(editForm.price) || 0 } : { ...editForm, price: parseFloat(editForm.price) || 0 };

      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save');

      const data = await res.json();

      if (id) {
        setServices(prev => prev.map(s => s.id === id ? data.service : s));
      } else {
        setServices(prev => [...prev, data.service]);
      }

      cancelEdit();
      toast({ title: 'Saved!', description: id ? 'Service updated' : 'Service created' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save service' });
    } finally {
      setSaving(null);
    }
  };

  // Delete service
  const deleteService = async (id: string) => {
    if (!confirm('Delete this service?')) return;

    setSaving(id);
    try {
      const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setServices(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Deleted', description: 'Service removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete service' });
    } finally {
      setSaving(null);
    }
  };

  // Quick toggle active status
  const toggleActive = async (service: ShopService) => {
    setSaving(service.id);
    try {
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, is_active: !service.is_active }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setServices(prev => prev.map(s =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update service' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">Services & Pricing</h3>
          <p className="text-sm text-text-muted mt-1">
            Customize your shop's services and prices
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="gap-2"
            disabled={showAddForm}
          >
            <Plus size={16} />
            Add Service
          </Button>
        )}
      </div>

      {/* Add new service form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-semibold text-text mb-4">New Service</h4>
              <ServiceForm
                form={editForm}
                setForm={setEditForm}
                onSave={() => saveService()}
                onCancel={cancelEdit}
                saving={saving === 'new'}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services by category */}
      <div className="space-y-3">
        {(Object.keys(CATEGORY_CONFIG) as ServiceCategory[]).map(category => {
          const config = CATEGORY_CONFIG[category];
          const categoryServices = servicesByCategory[category] || [];
          const isExpanded = expandedCategories.has(category);
          const Icon = config.icon;
          const activeCount = categoryServices.filter(s => s.is_active).length;

          return (
            <div key={category} className="rounded-xl border border-border-muted overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between bg-bg-light hover:bg-bg-light/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={config.color} />
                  <span className="font-medium text-text">{config.label}</span>
                  <span className="text-xs text-text-muted bg-bg px-2 py-0.5 rounded-full">
                    {activeCount}/{categoryServices.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={18} className="text-text-muted" />
                ) : (
                  <ChevronRight size={18} className="text-text-muted" />
                )}
              </button>

              {/* Services list */}
              <AnimatePresence>
                {isExpanded && categoryServices.length > 0 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-border-muted/50">
                      {categoryServices
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(service => (
                          <div key={service.id}>
                            {editingId === service.id ? (
                              <div className="p-4 bg-bg">
                                <ServiceForm
                                  form={editForm}
                                  setForm={setEditForm}
                                  onSave={() => saveService(service.id)}
                                  onCancel={cancelEdit}
                                  saving={saving === service.id}
                                  hideCategory
                                />
                              </div>
                            ) : (
                              <div className={`px-4 py-3 flex items-center justify-between transition-colors ${
                                service.is_active ? 'bg-bg' : 'bg-bg/50 opacity-60'
                              }`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium text-sm ${service.is_active ? 'text-text' : 'text-text-muted'}`}>
                                        {service.name}
                                      </span>
                                      {!service.is_taxable && (
                                        <span className="text-[10px] text-text-muted bg-bg-light px-1.5 py-0.5 rounded">
                                          No tax
                                        </span>
                                      )}
                                    </div>
                                    {service.description && (
                                      <p className="text-xs text-text-muted truncate mt-0.5">
                                        {service.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <span className="font-semibold text-sm text-text">
                                      ${service.price.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-text-muted ml-1">
                                      {PRICE_TYPE_LABELS[service.price_type]}
                                    </span>
                                  </div>
                                  {isOwner && (
                                    <div className="flex items-center gap-1">
                                      <Switch
                                        checked={service.is_active}
                                        onCheckedChange={() => toggleActive(service)}
                                        disabled={saving === service.id}
                                        className="scale-75"
                                      />
                                      <button
                                        onClick={() => startEdit(service)}
                                        className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-light transition-colors"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => deleteService(service.id)}
                                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                        disabled={saving === service.id}
                                      >
                                        {saving === service.id ? (
                                          <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                          <Trash2 size={14} />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {isExpanded && categoryServices.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-text-muted bg-bg">
                  No services in this category
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
        <AlertCircle size={16} className="text-info mt-0.5 flex-shrink-0" />
        <div className="text-xs text-text-muted">
          <strong className="text-text">Tip:</strong> Services with "per tire" pricing will automatically multiply based on how many tires are in the work order. Use "flat" for single-price services like alignment.
        </div>
      </div>
    </div>
  );
}

// Service edit form type
interface ServiceEditForm {
  name: string;
  description: string;
  price: string;
  price_type: ServicePriceType;
  is_taxable: boolean;
  is_active: boolean;
  category: ServiceCategory;
}

// Reusable form component for add/edit
interface ServiceFormProps {
  form: ServiceEditForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceEditForm>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  hideCategory?: boolean;
}

function ServiceForm({ form, setForm, onSave, onCancel, saving, hideCategory }: ServiceFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Service Name *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Mount & Balance"
            className="h-9"
          />
        </div>

        {/* Category */}
        {!hideCategory && (
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select
              value={form.category}
              onValueChange={v => setForm(prev => ({ ...prev, category: v as ServiceCategory }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_CONFIG) as [ServiceCategory, typeof CATEGORY_CONFIG[ServiceCategory]][]).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Price */}
        <div className="space-y-1.5">
          <Label className="text-xs">Price ($)</Label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* Price Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Price Type</Label>
          <Select
            value={form.price_type}
            onValueChange={v => setForm(prev => ({ ...prev, price_type: v as ServicePriceType }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_tire">Per Tire</SelectItem>
              <SelectItem value="flat">Flat Rate</SelectItem>
              <SelectItem value="per_unit">Per Unit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Input
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the service"
          className="h-9"
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={form.is_taxable}
            onCheckedChange={v => setForm(prev => ({ ...prev, is_taxable: v }))}
            className="scale-90"
          />
          <span className="text-sm text-text">Taxable</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={form.is_active}
            onCheckedChange={v => setForm(prev => ({ ...prev, is_active: v }))}
            className="scale-90"
          />
          <span className="text-sm text-text">Active</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={14} />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
