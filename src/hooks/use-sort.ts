import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

/**
 * Sorting hook for managing sortable data with type-safe fields
 *
 * @template T - The type of data being sorted
 * @template K - The keys of T that can be used for sorting
 * @param {T[]} data - The array of data to sort
 * @param {K} initialField - Initial field to sort by
 * @param {SortDirection} initialDirection - Initial sort direction (default: 'asc')
 * @returns Sorted data and sort controls
 *
 * @example
 * const { sortedData, sortField, sortDirection, toggleSort } =
 *   useSort(customers, 'name');
 *
 * // In your table header:
 * <th onClick={() => toggleSort('name')}>Name</th>
 */
export function useSort<T extends Record<string, any>, K extends keyof T>(
  data: T[],
  initialField: K,
  initialDirection: SortDirection = 'asc'
) {
  const [sortField, setSortField] = useState<K>(initialField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  /**
   * Toggle sort direction or change sort field
   * - If clicking same field: toggle direction
   * - If clicking new field: sort ascending
   */
  const toggleSort = (field: K) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Sort the data based on current field and direction
   */
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle null/undefined values - push to end
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Convert to comparable values
      let aCompare: string | number = aVal;
      let bCompare: string | number = bVal;

      // Handle date strings (ISO format)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Try to detect if it's a date string
        const dateRegex = /^\d{4}-\d{2}-\d{2}/;
        if (dateRegex.test(aVal) && dateRegex.test(bVal)) {
          aCompare = new Date(aVal).getTime();
          bCompare = new Date(bVal).getTime();
        } else {
          // String comparison (case-insensitive)
          aCompare = aVal.toLowerCase();
          bCompare = bVal.toLowerCase();
        }
      }

      // Numeric or processed comparison
      if (aCompare < bCompare) return sortDirection === 'asc' ? -1 : 1;
      if (aCompare > bCompare) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  return {
    sortedData,
    sortField,
    sortDirection,
    toggleSort,
    setSortField,
    setSortDirection,
  };
}
