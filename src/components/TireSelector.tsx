'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, X, ShoppingCart, Check, Trash2, ChevronDown, Package } from 'lucide-react';

export interface Tire {
  id: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
}

export interface SelectedTire {
  tire: Tire;
  quantity: number;
  customPrice?: number;
}

interface TireSelectorProps {
  tires: Tire[];
  selectedTires: SelectedTire[];
  onTiresChange: (tires: SelectedTire[]) => void;
  onTirePriceUpdate?: (tireId: string, newPrice: number) => void;
  customerTireSize?: string;
  className?: string;
  onStockError?: (message: string) => void;
  onInventoryUpdate?: (tireId: string, quantityChange: number) => Promise<void>;
}

export default function TireSelector({
  tires,
  selectedTires,
  onTiresChange,
  onTirePriceUpdate,
  customerTireSize,
  className = '',
  onStockError,
  onInventoryUpdate,
}: TireSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    width: '',
    aspect: '',
    rim: '',
    brand: '',
    inStockOnly: true,
  });
  const [expandedTireId, setExpandedTireId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempCustomPrice, setTempCustomPrice] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Parse tire size - supports multiple formats
  const parseTireSize = (size: string) => {
    // Try standard format: 225/45R17 or 225/45/17
    let match = size.match(/(\d+)[\/](\d+)[R\/]?(\d+)/i);
    if (match) {
      return { width: match[1], aspect: match[2], rim: match[3] };
    }
    return null;
  };

  // Get unique values from actual inventory
  const getUniqueValues = (field: 'width' | 'aspect' | 'rim' | 'brand') => {
    const values = new Set<string>();
    tires.forEach(tire => {
      if (field === 'brand') {
        if (tire.brand) values.add(tire.brand);
      } else {
        const parsed = parseTireSize(tire.size);
        if (parsed && parsed[field]) values.add(parsed[field]);
      }
    });
    return Array.from(values).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  };

  // Auto-detect customer's tire size
  useEffect(() => {
    if (customerTireSize) {
      const parsed = parseTireSize(customerTireSize);
      if (parsed) {
        setFilters(prev => ({
          ...prev,
          width: parsed.width,
          aspect: parsed.aspect,
          rim: parsed.rim,
        }));
      }
    }
  }, [customerTireSize]);

  // Filter tires
  const filteredTires = tires.filter(tire => {
    if (filters.inStockOnly && tire.quantity <= 0) return false;

    const parsed = parseTireSize(tire.size);
    if (parsed) {
      if (filters.width && parsed.width !== filters.width) return false;
      if (filters.aspect && parsed.aspect !== filters.aspect) return false;
      if (filters.rim && parsed.rim !== filters.rim) return false;
    }

    if (filters.brand && tire.brand !== filters.brand) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        tire.brand.toLowerCase().includes(query) ||
        tire.model.toLowerCase().includes(query) ||
        tire.size.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const addTire = async (tire: Tire, quantity: number, customPrice?: number) => {
    const existing = selectedTires.find(st => st.tire.id === tire.id);
    const currentQty = existing ? existing.quantity : 0;
    const availableStock = tire.quantity - currentQty;

    if (tire.quantity === 0) {
      onStockError?.(`${tire.brand} ${tire.model} is out of stock`);
      return;
    }

    const actualQuantity = Math.min(quantity, availableStock);

    if (actualQuantity < quantity) {
      onStockError?.(`Only ${availableStock} ${tire.brand} ${tire.model} available`);
    }

    if (actualQuantity === 0) return;

    if (onInventoryUpdate) {
      await onInventoryUpdate(tire.id, -actualQuantity);
    }

    const priceToUse = customPrice !== undefined ? customPrice : tire.price;

    if (existing) {
      onTiresChange(
        selectedTires.map(st =>
          st.tire.id === tire.id
            ? { ...st, quantity: st.quantity + actualQuantity, customPrice: priceToUse !== tire.price ? priceToUse : st.customPrice }
            : st
        )
      );
    } else {
      onTiresChange([...selectedTires, {
        tire,
        quantity: actualQuantity,
        customPrice: priceToUse !== tire.price ? priceToUse : undefined
      }]);
    }

    setExpandedTireId(null);
    setTempQuantity(1);
    setTempCustomPrice('');
  };

  const updateQuantity = async (tireId: string, delta: number) => {
    const st = selectedTires.find(s => s.tire.id === tireId);
    if (!st) return;

    const newQty = st.quantity + delta;

    if (newQty <= 0) {
      if (onInventoryUpdate) {
        await onInventoryUpdate(tireId, st.quantity);
      }
      onTiresChange(selectedTires.filter(s => s.tire.id !== tireId));
      return;
    }

    if (delta > 0 && newQty > st.tire.quantity) {
      onStockError?.(`Only ${st.tire.quantity} available`);
      return;
    }

    if (onInventoryUpdate) {
      await onInventoryUpdate(tireId, -delta);
    }

    onTiresChange(selectedTires.map(s =>
      s.tire.id === tireId ? { ...s, quantity: newQty } : s
    ));
  };

  const updatePrice = (tireId: string, newPrice: number) => {
    onTiresChange(selectedTires.map(st =>
      st.tire.id === tireId ? { ...st, customPrice: newPrice } : st
    ));
  };

  const removeTire = async (tireId: string) => {
    const st = selectedTires.find(s => s.tire.id === tireId);
    if (st && onInventoryUpdate) {
      await onInventoryUpdate(tireId, st.quantity);
    }
    onTiresChange(selectedTires.filter(s => s.tire.id !== tireId));
  };

  const clearAll = async () => {
    if (onInventoryUpdate) {
      for (const st of selectedTires) {
        await onInventoryUpdate(st.tire.id, st.quantity);
      }
    }
    onTiresChange([]);
  };

  const clearFilters = () => {
    setFilters({ width: '', aspect: '', rim: '', brand: '', inStockOnly: true });
    setSearchQuery('');
  };

  const totalCost = selectedTires.reduce((sum, st) => sum + (st.customPrice ?? st.tire.price) * st.quantity, 0);
  const totalQuantity = selectedTires.reduce((sum, st) => sum + st.quantity, 0);
  const hasActiveFilters = filters.width || filters.aspect || filters.rim || filters.brand || searchQuery;

  // Get available filter options from inventory
  const widthOptions = getUniqueValues('width');
  const aspectOptions = getUniqueValues('aspect');
  const rimOptions = getUniqueValues('rim');
  const brandOptions = getUniqueValues('brand');

  return (
    <div className={`rounded-xl border border-border-muted bg-bg overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="p-3 bg-bg-light/50 border-b border-border-muted">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tires..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-muted bg-bg text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-3 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-bg border-border-muted text-text-muted hover:text-text hover:border-border'
            }`}
          >
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>

          {/* In Stock Toggle */}
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, inStockOnly: !f.inStockOnly }))}
            className={`h-9 px-3 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${
              filters.inStockOnly
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-bg border-border-muted text-text-muted hover:text-text'
            }`}
          >
            {filters.inStockOnly && <Check size={14} />}
            In Stock
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border-muted">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-muted font-medium">Size:</span>

                  {/* Width */}
                  <select
                    value={filters.width}
                    onChange={(e) => setFilters(f => ({ ...f, width: e.target.value }))}
                    className="h-8 px-2 text-xs rounded-lg border border-border-muted bg-bg text-text cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Width</option>
                    {widthOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>

                  <span className="text-text-muted">/</span>

                  {/* Aspect */}
                  <select
                    value={filters.aspect}
                    onChange={(e) => setFilters(f => ({ ...f, aspect: e.target.value }))}
                    className="h-8 px-2 text-xs rounded-lg border border-border-muted bg-bg text-text cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Aspect</option>
                    {aspectOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>

                  <span className="text-text-muted">R</span>

                  {/* Rim */}
                  <select
                    value={filters.rim}
                    onChange={(e) => setFilters(f => ({ ...f, rim: e.target.value }))}
                    className="h-8 px-2 text-xs rounded-lg border border-border-muted bg-bg text-text cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Rim</option>
                    {rimOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  <div className="w-px h-6 bg-border-muted mx-1" />

                  {/* Brand */}
                  <select
                    value={filters.brand}
                    onChange={(e) => setFilters(f => ({ ...f, brand: e.target.value }))}
                    className="h-8 px-2 text-xs rounded-lg border border-border-muted bg-bg text-text cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Brands</option>
                    {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-auto text-xs text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="px-3 py-2 flex items-center justify-between bg-bg-light/30 border-b border-border-muted">
        <span className="text-xs text-text-muted">
          {filteredTires.length} tire{filteredTires.length !== 1 ? 's' : ''} found
        </span>
        {customerTireSize && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Size: {customerTireSize}
          </span>
        )}
      </div>

      {/* Tire List */}
      <div className="max-h-[240px] overflow-y-auto">
        {filteredTires.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={32} className="mx-auto text-text-muted mb-3 opacity-40" />
            <p className="text-sm text-text-muted mb-2">No tires match your filters</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-muted">
            {filteredTires.map((tire) => {
              const isExpanded = expandedTireId === tire.id;
              const existing = selectedTires.find(st => st.tire.id === tire.id);
              const currentQty = existing ? existing.quantity : 0;
              const availableStock = tire.quantity - currentQty;
              const isOutOfStock = tire.quantity === 0 || availableStock === 0;

              return (
                <div key={tire.id} className={`${isOutOfStock ? 'opacity-50' : ''}`}>
                  {/* Tire Row */}
                  <div
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      isExpanded ? 'bg-primary/5' : 'hover:bg-bg-light/50'
                    }`}
                  >
                    {/* Tire Info + Stock Badge */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text text-sm">
                        {tire.brand} {tire.model}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-muted">{tire.size}</span>
                        {isOutOfStock ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/10 text-danger font-medium">
                            {currentQty > 0 ? `${currentQty} in cart` : 'Out'}
                          </span>
                        ) : availableStock < 10 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                            {availableStock} left
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                            {availableStock} in stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Editable Price */}
                    <div className="flex items-center h-7 px-1.5 rounded border border-border-muted bg-bg hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                      <span className="text-text-muted text-xs">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tire.price || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                            onTirePriceUpdate?.(tire.id, val === '' ? 0 : parseFloat(val) || 0);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 bg-transparent text-xs font-semibold text-text outline-none"
                        placeholder="0"
                      />
                    </div>

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isOutOfStock) {
                          setExpandedTireId(isExpanded ? null : tire.id);
                          setTempQuantity(1);
                          setTempCustomPrice('');
                        }
                      }}
                      disabled={isOutOfStock}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                        isOutOfStock
                          ? 'bg-bg-light text-text-muted cursor-not-allowed'
                          : isExpanded
                          ? 'bg-primary text-white'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      <Plus size={14} className={`transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
                      {isExpanded ? 'Cancel' : 'Add'}
                    </button>
                  </div>

                  {/* Expanded Add Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden bg-primary/5 border-t border-primary/10"
                      >
                        <div className="px-4 py-3 flex items-center gap-3">
                          {/* Quantity Label */}
                          <span className="text-xs text-text-muted font-medium">Qty:</span>

                          {/* Quantity Controls */}
                          <div className="flex items-center bg-bg border border-border-muted rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                              className="w-9 h-9 flex items-center justify-center hover:bg-bg-light transition-colors"
                            >
                              <Minus size={14} className="text-text-muted" />
                            </button>
                            <span className="w-10 text-center text-sm font-bold text-text border-x border-border-muted">
                              {tempQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTempQuantity(Math.min(availableStock, tempQuantity + 1))}
                              disabled={tempQuantity >= availableStock}
                              className="w-9 h-9 flex items-center justify-center hover:bg-bg-light transition-colors disabled:opacity-50"
                            >
                              <Plus size={14} className="text-text-muted" />
                            </button>
                          </div>

                          {/* Subtotal Preview */}
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg border border-border-muted">
                            <span className="text-xs text-text-muted">Total:</span>
                            <span className="text-sm font-bold text-text">${(tire.price * tempQuantity).toFixed(2)}</span>
                          </div>

                          {/* Add Button */}
                          <button
                            type="button"
                            onClick={() => addTire(tire, tempQuantity)}
                            className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                          >
                            <ShoppingCart size={14} />
                            Add to Order
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {selectedTires.length > 0 && (
        <div className="border-t border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="px-4 py-2 flex items-center justify-between border-b border-primary/10">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-primary" />
              <span className="text-sm font-semibold text-text">
                Selected Tires ({totalQuantity})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">${totalCost.toFixed(2)}</span>
              <button
                type="button"
                onClick={clearAll}
                className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                title="Clear All"
              >
                <Trash2 size={14} className="text-danger" />
              </button>
            </div>
          </div>

          <div className="max-h-[120px] overflow-y-auto divide-y divide-border-muted/50">
            {selectedTires.map((st) => {
              const effectivePrice = st.customPrice ?? st.tire.price;
              return (
                <div key={st.tire.id} className="px-4 py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text block truncate">
                      {st.tire.brand} {st.tire.model}
                    </span>
                    <span className="text-xs text-text-muted">{st.tire.size}</span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-bg border border-border-muted rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateQuantity(st.tire.id, -1)}
                      className="p-1.5 hover:bg-bg-light transition-colors"
                    >
                      <Minus size={12} className="text-text-muted" />
                    </button>
                    <span className="w-6 text-center text-xs font-semibold text-text">
                      {st.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(st.tire.id, 1)}
                      disabled={st.quantity >= st.tire.quantity}
                      className="p-1.5 hover:bg-bg-light transition-colors disabled:opacity-50"
                    >
                      <Plus size={12} className="text-text-muted" />
                    </button>
                  </div>

                  {/* Editable Price */}
                  <div className="flex items-center h-7 px-2 rounded border border-border-muted bg-bg hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <span className="text-text-muted text-xs">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={effectivePrice || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          updatePrice(st.tire.id, val === '' ? 0 : parseFloat(val) || 0);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-14 bg-transparent text-xs font-medium text-text text-right outline-none"
                      placeholder="0"
                    />
                  </div>

                  {/* Line Total */}
                  <span className="text-sm font-semibold text-text w-16 text-right">
                    ${(effectivePrice * st.quantity).toFixed(2)}
                  </span>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeTire(st.tire.id)}
                    className="p-1.5 hover:bg-danger/10 rounded transition-colors"
                  >
                    <X size={12} className="text-danger" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
