'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, X, ShoppingCart, Filter, Check, Trash2, ChevronLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
}

interface TireSelectorProps {
  tires: Tire[];
  selectedTires: SelectedTire[];
  onTiresChange: (tires: SelectedTire[]) => void;
  customerTireSize?: string;
  className?: string;
  onStockError?: (message: string) => void;
  onInventoryUpdate?: (tireId: string, quantityChange: number) => Promise<void>;
}

export default function TireSelector({
  tires,
  selectedTires,
  onTiresChange,
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
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  // Parse tire size
  const parseTireSize = (size: string) => {
    const match = size.match(/(\d+)\/(\d+)R(\d+)/);
    if (!match) return null;
    return {
      width: match[1],
      aspect: match[2],
      rim: match[3],
    };
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

    if (filters.brand && !tire.brand.toLowerCase().includes(filters.brand.toLowerCase())) {
      return false;
    }

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

  // Get unique values for filters
  const getUniqueValues = (field: 'width' | 'aspect' | 'rim' | 'brand') => {
    const values = new Set<string>();
    tires.forEach(tire => {
      if (field === 'brand') {
        values.add(tire.brand);
      } else {
        const parsed = parseTireSize(tire.size);
        if (parsed) values.add(parsed[field]);
      }
    });
    return Array.from(values).sort();
  };

  const addTire = async (tire: Tire, quantity: number) => {
    const existing = selectedTires.find(st => st.tire.id === tire.id);
    const currentQty = existing ? existing.quantity : 0;
    const availableStock = tire.quantity - currentQty;

    if (tire.quantity === 0) {
      onStockError?.(`${tire.brand} ${tire.model} is out of stock`);
      return;
    }

    const actualQuantity = Math.min(quantity, availableStock);

    if (actualQuantity < quantity) {
      onStockError?.(`Only ${availableStock} ${tire.brand} ${tire.model} available in stock`);
    }

    if (actualQuantity === 0) {
      return;
    }

    // Update inventory in database (decrease stock)
    if (onInventoryUpdate) {
      await onInventoryUpdate(tire.id, -actualQuantity);
    }

    if (existing) {
      onTiresChange(
        selectedTires.map(st =>
          st.tire.id === tire.id ? { ...st, quantity: st.quantity + actualQuantity } : st
        )
      );
    } else {
      onTiresChange([...selectedTires, { tire, quantity: actualQuantity }]);
    }

    // Reset and collapse
    setExpandedTireId(null);
    setTempQuantity(1);
  };

  const updateQuantity = async (tireId: string, delta: number) => {
    const st = selectedTires.find(s => s.tire.id === tireId);
    if (!st) return;

    const newQty = st.quantity + delta;

    // If removing completely
    if (newQty <= 0) {
      if (onInventoryUpdate) {
        await onInventoryUpdate(tireId, st.quantity); // Restore all
      }
      onTiresChange(selectedTires.filter(s => s.tire.id !== tireId));
      return;
    }

    // Check stock limit when increasing
    if (delta > 0 && newQty > st.tire.quantity) {
      onStockError?.(`Only ${st.tire.quantity} ${st.tire.brand} ${st.tire.model} available in stock`);
      return;
    }

    // Update inventory in database
    if (onInventoryUpdate) {
      await onInventoryUpdate(tireId, -delta); // Negative delta = decrease stock
    }

    const updated = selectedTires.map(s =>
      s.tire.id === tireId ? { ...s, quantity: newQty } : s
    );
    onTiresChange(updated);
  };

  const removeTire = async (tireId: string) => {
    const st = selectedTires.find(s => s.tire.id === tireId);
    if (st && onInventoryUpdate) {
      await onInventoryUpdate(tireId, st.quantity); // Restore stock
    }
    onTiresChange(selectedTires.filter(s => s.tire.id !== tireId));
  };

  const clearAll = async () => {
    // Restore all inventory
    if (onInventoryUpdate) {
      for (const st of selectedTires) {
        await onInventoryUpdate(st.tire.id, st.quantity);
      }
    }
    onTiresChange([]);
  };

  const clearFilters = () => {
    setFilters({
      width: '',
      aspect: '',
      rim: '',
      brand: '',
      inStockOnly: true,
    });
    setSearchQuery('');
  };

  const getStockBadge = (quantity: number, inCart: number = 0) => {
    const availableQty = quantity - inCart;
    if (availableQty === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-danger/20 text-xs font-medium text-danger border border-danger/30 text-center">
          {inCart > 0 ? `All ${quantity} in cart` : 'Out of Stock'}
        </span>
      );
    } else if (availableQty < 10) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-xs font-medium text-secondary border border-secondary/30 text-center">
          {inCart > 0 ? `${availableQty} left (${inCart} in cart)` : `Low Stock ${availableQty}`}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded-full bg-success/20 text-xs font-medium text-success border border-success/30 text-center">
          {inCart > 0 ? `${availableQty} left (${inCart} in cart)` : `In Stock ${availableQty}`}
        </span>
      );
    }
  };

  const totalCost = selectedTires.reduce((sum, st) => sum + st.tire.price * st.quantity, 0);
  const totalQuantity = selectedTires.reduce((sum, st) => sum + st.quantity, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Header */}
      <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Select Tires</h3>

      {/* Filters */}
      <div className="p-4 rounded-lg bg-bg border border-border-muted">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            <span className="text-sm font-medium text-text-muted">
              Filters
            </span>
            {customerTireSize && (
              <span className="px-2 py-0.5 rounded bg-bg-light text-xs font-medium text-text border border-border-muted">
                {customerTireSize}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-primary hover:underline font-medium"
          >
            Clear Filters
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select value={filters.width || '__none__'} onValueChange={value => setFilters({ ...filters, width: value === '__none__' ? '' : value })}>
            <SelectTrigger className="bg-bg-light border-border-muted text-text hover:bg-highlight cursor-pointer">
              <SelectValue placeholder="Width" />
            </SelectTrigger>
            <SelectContent className="bg-bg-light border-border-muted">
              <SelectItem value="__none__" className="text-text hover:bg-highlight cursor-pointer">All</SelectItem>
              {getUniqueValues('width').map(option => (
                <SelectItem key={option} value={option} className="text-text hover:bg-highlight cursor-pointer">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.aspect || '__none__'} onValueChange={value => setFilters({ ...filters, aspect: value === '__none__' ? '' : value })}>
            <SelectTrigger className="bg-bg-light border-border-muted text-text hover:bg-highlight cursor-pointer">
              <SelectValue placeholder="Aspect" />
            </SelectTrigger>
            <SelectContent className="bg-bg-light border-border-muted">
              <SelectItem value="__none__" className="text-text hover:bg-highlight cursor-pointer">All</SelectItem>
              {getUniqueValues('aspect').map(option => (
                <SelectItem key={option} value={option} className="text-text hover:bg-highlight cursor-pointer">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.rim || '__none__'} onValueChange={value => setFilters({ ...filters, rim: value === '__none__' ? '' : value })}>
            <SelectTrigger className="bg-bg-light border-border-muted text-text hover:bg-highlight cursor-pointer">
              <SelectValue placeholder="Rim" />
            </SelectTrigger>
            <SelectContent className="bg-bg-light border-border-muted">
              <SelectItem value="__none__" className="text-text hover:bg-highlight cursor-pointer">All</SelectItem>
              {getUniqueValues('rim').map(option => (
                <SelectItem key={option} value={option} className="text-text hover:bg-highlight cursor-pointer">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.brand || '__none__'} onValueChange={value => setFilters({ ...filters, brand: value === '__none__' ? '' : value })}>
            <SelectTrigger className="bg-bg-light border-border-muted text-text hover:bg-highlight cursor-pointer">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent className="bg-bg-light border-border-muted">
              <SelectItem value="__none__" className="text-text hover:bg-highlight cursor-pointer">All Brands</SelectItem>
              {getUniqueValues('brand').map(option => (
                <SelectItem key={option} value={option} className="text-text hover:bg-highlight cursor-pointer">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* In Stock Toggle */}
        <button
          type="button"
          onClick={() => setFilters({ ...filters, inStockOnly: !filters.inStockOnly })}
          className={`w-full py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            filters.inStockOnly
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-bg-light border-border-muted text-text-muted hover:border-border'
          }`}
        >
          {filters.inStockOnly && <Check size={16} />}
          <span>In Stock Only</span>
        </button>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search brand, model, or size..."
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-border-muted bg-bg-light text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent"
          />
        </div>
      </div>

      {/* Available Tires List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-medium text-text-muted">
            Available Tires ({filteredTires.length})
          </h4>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
          <AnimatePresence mode="popLayout">
            {filteredTires.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center bg-bg rounded-lg border border-border-muted"
              >
                <p className="text-text-muted font-medium mb-2">No tires match your filters</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters to see all tires
                </button>
              </motion.div>
            ) : (
              filteredTires.map((tire) => {
                const isExpanded = expandedTireId === tire.id;
                const existing = selectedTires.find(st => st.tire.id === tire.id);
                const currentQty = existing ? existing.quantity : 0;
                const availableStock = tire.quantity - currentQty;

                return (
                  <motion.div
                    key={tire.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="bg-bg rounded-lg border border-border-muted overflow-hidden"
                  >
                    {/* Tire Card - Clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        if (tire.quantity > 0) {
                          setExpandedTireId(isExpanded ? null : tire.id);
                          setTempQuantity(1);
                        }
                      }}
                      className={`w-full p-4 text-left transition-colors ${
                        isExpanded
                          ? 'bg-bg-light'
                          : 'hover:bg-bg-light/50'
                      } ${tire.quantity === 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Tire Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-base font-medium text-text mb-1">
                            {tire.brand} {tire.model}
                          </h5>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="text-text-muted font-medium">{tire.size}</span>
                            <span className="text-lg font-medium text-text">
                              ${tire.price.toFixed(2)}
                            </span>
                            {getStockBadge(tire.quantity, currentQty)}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded: Quantity Stepper + Add Button */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-border-muted bg-bg-light"
                        >
                          <div className="p-4 flex items-center gap-3">
                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-muted">Quantity:</span>
                              <div className="flex items-center gap-1 bg-bg border border-border-muted rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                                  className="p-2 hover:bg-bg-light rounded transition-colors"
                                >
                                  <Minus size={16} className="text-text-muted" />
                                </button>
                                <span className="px-4 text-base font-bold text-text min-w-[3ch] text-center">
                                  {tempQuantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setTempQuantity(Math.min(availableStock, tempQuantity + 1))}
                                  disabled={tempQuantity >= availableStock}
                                  className="p-2 hover:bg-bg-light rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus size={16} className="text-text-muted" />
                                </button>
                              </div>
                            </div>

                            {/* Add Button */}
                            <button
                              type="button"
                              onClick={() => addTire(tire, tempQuantity)}
                              disabled={availableStock === 0}
                              className="flex-1 py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={18} />
                              Add to Cart ({tempQuantity})
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Slide-out Cart Panel */}
      <>
        {/* Toggle Button - Fixed to right edge */}
        <button
          type="button"
          onClick={() => setIsCartExpanded(!isCartExpanded)}
          className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 py-3 px-3 rounded-l-lg shadow-lg transition-all ${
            isCartExpanded ? 'right-[360px]' : 'right-0'
          } ${
            selectedTires.length > 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-bg-light text-text-muted border border-r-0 border-border-muted'
          }`}
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {selectedTires.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {totalQuantity}
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isCartExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft size={16} />
          </motion.div>
        </button>

        {/* Slide-out Panel */}
        <AnimatePresence>
          {isCartExpanded && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartExpanded(false)}
                className="fixed inset-0 bg-black z-40"
              />

              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-[360px] bg-bg border-l border-border-muted shadow-2xl z-50 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-border-muted bg-bg-light flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={20} className="text-primary" />
                    <div>
                      <h3 className="text-base font-semibold text-text">Cart</h3>
                      <p className="text-xs text-text-muted">
                        {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTires.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="p-2 hover:bg-danger/10 rounded-lg transition-colors"
                        title="Clear All"
                      >
                        <Trash2 size={16} className="text-danger" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCartExpanded(false)}
                      className="p-2 hover:bg-bg rounded-lg transition-colors"
                    >
                      <X size={18} className="text-text-muted" />
                    </button>
                  </div>
                </div>

                {/* Cart Content */}
                <div className="flex-1 overflow-y-auto">
                  {selectedTires.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <div className="p-4 rounded-full bg-bg-light mb-4">
                        <ShoppingCart size={32} className="text-text-muted" />
                      </div>
                      <p className="text-text font-medium mb-1">Cart is empty</p>
                      <p className="text-sm text-text-muted">
                        Select tires from the list to add them here
                      </p>
                    </div>
                  ) : (
                    /* Compact Table */
                    <table className="w-full">
                      <thead className="bg-bg-light sticky top-0">
                        <tr className="text-xs text-text-muted uppercase tracking-wide">
                          <th className="text-left py-2 px-4 font-medium">Tire</th>
                          <th className="text-center py-2 px-2 font-medium">Qty</th>
                          <th className="text-right py-2 px-4 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTires.map((st, index) => (
                          <tr
                            key={st.tire.id}
                            className={`border-b border-border-muted ${
                              index % 2 === 0 ? 'bg-bg' : 'bg-bg-light/30'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-text truncate">
                                    {st.tire.brand} {st.tire.model}
                                  </div>
                                  <div className="text-xs text-text-muted">
                                    {st.tire.size} • ${st.tire.price.toFixed(2)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTire(st.tire.id)}
                                  className="p-1 hover:bg-danger/10 rounded transition-colors flex-shrink-0"
                                >
                                  <X size={14} className="text-danger" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center justify-center gap-1 bg-bg-light rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(st.tire.id, -1)}
                                  className="p-1 hover:bg-bg rounded transition-colors"
                                >
                                  <Minus size={14} className="text-text-muted" />
                                </button>
                                <span className="px-2 text-sm font-semibold text-text min-w-[2ch] text-center">
                                  {st.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(st.tire.id, 1)}
                                  disabled={st.quantity >= st.tire.quantity}
                                  className="p-1 hover:bg-bg rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus size={14} className="text-text-muted" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm font-semibold text-text">
                                ${(st.tire.price * st.quantity).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer - Total */}
                {selectedTires.length > 0 && (
                  <div className="border-t border-border-muted bg-bg-light flex-shrink-0 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-text">Total</span>
                      <span className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    </div>
  );
}
