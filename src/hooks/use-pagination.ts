import { useState, useMemo, useEffect } from 'react';

/**
 * Pagination hook for managing paginated data
 *
 * @template T - The type of data being paginated
 * @param {T[]} data - The array of data to paginate
 * @param {number} itemsPerPage - Number of items to show per page (default: 10)
 * @returns Pagination state and controls
 *
 * @example
 * const { currentPage, totalPages, paginatedData, goToPage, nextPage, prevPage } =
 *   usePagination(customers, 10);
 */
export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.ceil(data.length / itemsPerPage),
    [data.length, itemsPerPage]
  );

  // Reset to page 1 when data changes (e.g., after filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Get paginated data for current page
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Navigation functions
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Pagination metadata
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, data.length);
  const totalItems = data.length;

  return {
    // Current state
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,

    // Paginated data
    paginatedData,

    // Navigation
    goToPage,
    nextPage,
    prevPage,

    // Helpers
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  };
}
