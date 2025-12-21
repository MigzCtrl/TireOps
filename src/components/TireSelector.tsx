'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, X, ShoppingCart, Filter, Check } from 'lucide-react';
import CustomSelect from './CustomSelect';

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
  customerTireSize?: string; // e.g., "205/55R16"
  className?: string;
  onStockError?: (message: string) => void;
}

export default function TireSelector({
  tires,
  selectedTires,
  onTiresChange,
  customerTireSize,
  className = '',
  onStockError,
}: TireSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    width: '',
    aspect: '',
    rim: '',
    brand: '',
    inStockOnly: true,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [cartExpanded, setCartExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Parse tire size (e.g., "205/55R16" -> { width: "205", aspect: "55", rim: "16" })
  const parseTireSize = (size: string) => {
    const match = size.match(/(\d+)\/(\d+)R(\d+)/);
    if (!match) return null;
    return {
      width: match[1],
      aspect: match[2],
      rim: match[3],
    };
  };

  // Auto-detect customer's tire size and set filters
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

  // Filter tires based on search and filters
  const filteredTires = tires.filter(tire => {
    // Stock filter
    if (filters.inStockOnly && tire.quantity <= 0) return false;

    // Size filters
    const parsed = parseTireSize(tire.size);
    if (parsed) {
      if (filters.width && parsed.width !== filters.width) return false;
      if (filters.aspect && parsed.aspect !== filters.aspect) return false;
      if (filters.rim && parsed.rim !== filters.rim) return false;
    }

    // Brand filter
    if (filters.brand && !tire.brand.toLowerCase().includes(filters.brand.toLowerCase())) {
      return false;
    }

    // Search query
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

  const addTire = (tire: Tire, quantity: number = 1) => {
    const existing = selectedTires.find(st => st.tire.id === tire.id);
    const currentQty = existing ? existing.quantity : 0;
    const availableStock = tire.quantity - currentQty;

    // Check if tire has no stock
    if (tire.quantity === 0) {
      onStockError?.(`${tire.brand} ${tire.model} is out of stock`);
      return;
    }

    // Cap quantity to available stock
    const actualQuantity = Math.min(quantity, availableStock);

    // Show error if requested more than available
    if (actualQuantity < quantity) {
      onStockError?.(`Only ${availableStock} ${tire.brand} ${tire.model} available in stock`);
    }

    // Don't add if no stock available
    if (actualQuantity === 0) {
      return;
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
  };

  const updateQuantity = (tireId: string, delta: number) => {
    const updated = selectedTires
      .map(st => {
        if (st.tire.id === tireId) {
          const newQty = st.quantity + delta;

          // Don't allow negative or zero quantities (remove instead)
          if (newQty <= 0) return null;

          // Enforce stock limit when increasing
          if (delta > 0 && newQty > st.tire.quantity) {
            onStockError?.(`Only ${st.tire.quantity} ${st.tire.brand} ${st.tire.model} available in stock`);
            return { ...st, quantity: st.tire.quantity }; // Cap at max stock
          }

          return { ...st, quantity: newQty };
        }
        return st;
      })
      .filter(Boolean) as SelectedTire[];
    onTiresChange(updated);
  };

  const removeTire = (tireId: string) => {
    onTiresChange(selectedTires.filter(st => st.tire.id !== tireId));
  };

  const setPreset = (count: number) => {
    // Only apply to the currently selected tire
    if (filteredTires.length > 0 && selectedIndex >= 0 && selectedIndex < filteredTires.length) {
      const tire = filteredTires[selectedIndex];
      addTire(tire, count);
    }
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchInputRef.current || document.activeElement !== searchInputRef.current) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIndex(prev => {
          const newIndex = prev < 0 ? 0 : Math.min(prev + 1, filteredTires.length - 1);
          return newIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIndex(prev => Math.max(prev - 1, 0));
      } else if ((e.key === 'Enter' || e.key === ' ') && filteredTires.length > 0 && hoveredIndex >= 0) {
        e.preventDefault();
        // Enter/Space selects the hovered tire
        setSelectedIndex(hoveredIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredTires, hoveredIndex]);

  // Scroll hovered item into view
  useEffect(() => {
    if (resultsRef.current && hoveredIndex >= 0) {
      const hovered = resultsRef.current.children[hoveredIndex] as HTMLElement;
      hovered?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [hoveredIndex]);

  const totalCost = selectedTires.reduce((sum, st) => sum + st.tire.price * st.quantity, 0);
  const totalQuantity = selectedTires.reduce((sum, st) => sum + st.quantity, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Header */}
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Select Tires</h3>

      {/* Filters Card */}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Filters
            </span>
            {customerTireSize && (
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                {customerTireSize}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
          >
            Clear
          </button>
        </div>

        {/* Single Row Filters with Wrap */}
        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700/50">
          <div className="w-[calc(33.333%-0.333rem)]">
            <CustomSelect
              value={filters.width}
              onChange={value => setFilters({ ...filters, width: value })}
              options={['', ...getUniqueValues('width')]}
              placeholder="Width"
            />
          </div>
          <div className="w-[calc(33.333%-0.333rem)]">
            <CustomSelect
              value={filters.aspect}
              onChange={value => setFilters({ ...filters, aspect: value })}
              options={['', ...getUniqueValues('aspect')]}
              placeholder="Aspect"
            />
          </div>
          <div className="w-[calc(33.333%-0.333rem)]">
            <CustomSelect
              value={filters.rim}
              onChange={value => setFilters({ ...filters, rim: value })}
              options={['', ...getUniqueValues('rim')]}
              placeholder="Rim"
            />
          </div>
          <div className="w-[calc(50%-0.25rem)]">
            <CustomSelect
              value={filters.brand}
              onChange={value => setFilters({ ...filters, brand: value })}
              options={['', ...getUniqueValues('brand')]}
              placeholder="All Brands"
            />
          </div>
          {/* In Stock Only Chip */}
          <div className="w-[calc(50%-0.25rem)]">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, inStockOnly: !filters.inStockOnly })}
              className={`w-full h-11 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                filters.inStockOnly
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {filters.inStockOnly && <Check size={14} />}
              <span>In Stock Only</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedIndex(-1); // Clear selection when searching
              setHoveredIndex(-1);
            }}
            placeholder="Search brand, model, or size..."
            className="w-full h-11 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Segmented Quantity Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Quick Add</span>
          {filteredTires.length > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-500">
              {selectedIndex >= 0 && filteredTires[selectedIndex]
                ? `Selected: ${filteredTires[selectedIndex].brand} ${filteredTires[selectedIndex].model}`
                : 'Click to select a tire'}
            </span>
          )}
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {[1, 2, 3, 4].map(qty => {
            const selectedTire = selectedIndex >= 0 ? filteredTires[selectedIndex] : null;
            const existing = selectedTire ? selectedTires.find(st => st.tire.id === selectedTire.id) : null;
            const currentQty = existing ? existing.quantity : 0;
            const availableStock = selectedTire ? selectedTire.quantity - currentQty : 0;
            const isDisabled = filteredTires.length === 0 || !selectedTire || availableStock === 0;
            const exceedsStock = selectedTire && qty > availableStock;

            return (
              <button
                key={qty}
                type="button"
                onClick={() => setPreset(qty)}
                disabled={isDisabled}
                className={`flex-1 h-9 rounded-md text-xs font-semibold transition-all shadow-sm disabled:cursor-not-allowed ${
                  exceedsStock
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
                    : isDisabled
                    ? 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 opacity-40'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow'
                }`}
                title={exceedsStock ? `Only ${availableStock} available` : isDisabled ? 'Click to select a tire first' : `Add ${qty} tire(s)`}
              >
                {qty}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredTires.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center text-gray-500 dark:text-gray-400"
            >
              <p className="font-medium">No tires match your filters</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters to see all tires
              </button>
            </motion.div>
          ) : (
            <div ref={resultsRef}>
              {filteredTires.map((tire, index) => (
                <motion.div
                  key={tire.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(-1)}
                  onClick={() => setSelectedIndex(index)}
                  className={`px-4 py-3 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 cursor-pointer ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/10 ring-2 ring-inset ring-blue-400 dark:ring-blue-600'
                      : index === hoveredIndex
                      ? 'bg-gray-100 dark:bg-gray-700/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Tire Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                          {tire.brand} {tire.model}
                        </h4>
                        {tire.quantity <= 5 && tire.quantity > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-[10px] font-medium text-yellow-700 dark:text-yellow-400 flex-shrink-0">
                            Low Stock
                          </span>
                        )}
                        {tire.quantity === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-[10px] font-medium text-red-700 dark:text-red-400 flex-shrink-0">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{tire.size}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${tire.price.toFixed(2)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500">
                          {tire.quantity} in stock
                        </span>
                      </div>
                    </div>

                    {/* Right: Add Button */}
                    <button
                      type="button"
                      onClick={() => addTire(tire, 1)}
                      disabled={tire.quantity === 0}
                      className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex-shrink-0"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Tires Dock - Compact & Collapsible */}
      <AnimatePresence>
        {selectedTires.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50"
          >
            {/* Collapsed Summary Bar */}
            {!cartExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setCartExpanded(true)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <ShoppingCart size={16} />
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span>{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
                  <span className="text-blue-200">—</span>
                  <span>${totalCost.toFixed(2)}</span>
                </div>
              </motion.button>
            )}

            {/* Expanded Panel */}
            {cartExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-80 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={14} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Selected ({totalQuantity})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartExpanded(false)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X size={14} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Items List */}
                <div className="max-h-64 overflow-y-auto">
                  {selectedTires.map(st => (
                    <div
                      key={st.tire.id}
                      className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Tire Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                            {st.tire.brand} {st.tire.model}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            {st.tire.size}
                          </div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-300 font-medium mt-0.5">
                            ${st.tire.price.toFixed(2)} × {st.quantity} = ${(st.tire.price * st.quantity).toFixed(2)}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(st.tire.id, -1)}
                              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Decrease quantity"
                            >
                              <Minus size={12} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="px-1.5 text-[11px] font-semibold text-gray-900 dark:text-white min-w-[1.5ch] text-center">
                              {st.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(st.tire.id, 1)}
                              disabled={st.quantity >= st.tire.quantity}
                              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={st.quantity >= st.tire.quantity ? `Max stock: ${st.tire.quantity}` : 'Increase quantity'}
                            >
                              <Plus size={12} className="text-gray-600 dark:text-gray-300" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeTire(st.tire.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Remove"
                          >
                            <X size={12} className="text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer - Total */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">${totalCost.toFixed(2)}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
