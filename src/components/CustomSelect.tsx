'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable = true,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredOptions.length > 0) {
        e.preventDefault();
        onChange(filteredOptions[highlightedIndex]);
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredOptions, highlightedIndex, onChange]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Calculate dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const displayValue = value || placeholder;
  const hasValue = !!value;

  const dropdownContent = isOpen && (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 10000,
      }}
      className="bg-bg-light rounded-lg border border-border-muted shadow-2xl overflow-hidden"
    >
      {/* Search Input */}
      {searchable && (
        <div className="p-2 border-b border-border-muted">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-7 pr-2 rounded border border-border-muted bg-bg-light text-text text-xs placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-text-muted">
            No options found
          </div>
        ) : (
          filteredOptions.map((option, index) => (
            <button
              key={option || `empty-${index}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(option);
                setIsOpen(false);
                setSearchQuery('');
                triggerRef.current?.focus();
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors rounded-md ${
                index === highlightedIndex
                  ? 'bg-bg text-text'
                  : 'text-text hover:bg-bg'
              } ${
                index !== filteredOptions.length - 1 ? 'mb-1' : ''
              }`}
            >
              <span>{option || '(Clear)'}</span>
              {value === option && <Check size={14} className="text-primary" />}
            </button>
          ))
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 rounded-lg border border-border-muted bg-bg-light text-text flex items-center justify-between gap-2 hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent ${className}`}
      >
        <span className={`flex-1 text-left text-xs truncate ${!hasValue ? 'text-text-muted' : ''}`}>
          {displayValue}
        </span>
        <ChevronDown
          size={16}
          className={`text-text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
