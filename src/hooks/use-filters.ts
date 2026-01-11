import { useState, useMemo } from 'react';

/**
 * Generic filter function type
 * @template T - The type of data being filtered
 */
export type FilterFunction<T> = (item: T) => boolean;

/**
 * Filters hook for managing searchable and filterable data
 *
 * @template T - The type of data being filtered
 * @param {T[]} data - The array of data to filter
 * @param {(item: T, searchTerm: string) => boolean} searchFn - Function to determine if item matches search
 * @returns Filtered data and filter controls
 *
 * @example
 * const { filteredData, searchTerm, setSearchTerm, addFilter, removeFilter, clearFilters } =
 *   useFilters(customers, (customer, search) =>
 *     customer.name.toLowerCase().includes(search.toLowerCase())
 *   );
 *
 * // Add custom filter
 * addFilter('active', (customer) => customer.order_count > 0);
 */
export function useFilters<T>(
  data: T[],
  searchFn?: (item: T, searchTerm: string) => boolean
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Map<string, FilterFunction<T>>>(new Map());

  /**
   * Add or update a named filter
   */
  const addFilter = (name: string, filterFn: FilterFunction<T>) => {
    setFilters(prev => new Map(prev).set(name, filterFn));
  };

  /**
   * Remove a named filter
   */
  const removeFilter = (name: string) => {
    setFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.delete(name);
      return newFilters;
    });
  };

  /**
   * Clear all filters (keeps search term)
   */
  const clearFilters = () => {
    setFilters(new Map());
  };

  /**
   * Clear search term only
   */
  const clearSearch = () => {
    setSearchTerm('');
  };

  /**
   * Clear everything
   */
  const clearAll = () => {
    setSearchTerm('');
    setFilters(new Map());
  };

  /**
   * Apply all filters and search to the data
   */
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search filter if search term exists and search function provided
    if (searchTerm && searchFn) {
      result = result.filter(item => searchFn(item, searchTerm));
    }

    // Apply all custom filters
    filters.forEach(filterFn => {
      result = result.filter(filterFn);
    });

    return result;
  }, [data, searchTerm, filters, searchFn]);

  return {
    // Filtered data
    filteredData,

    // Search
    searchTerm,
    setSearchTerm,
    clearSearch,

    // Custom filters
    filters,
    addFilter,
    removeFilter,
    clearFilters,

    // Utilities
    clearAll,
    hasActiveFilters: filters.size > 0 || searchTerm.length > 0,
  };
}
