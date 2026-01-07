import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseCrud, getErrorMessage } from './use-supabase-crud';

// Mock the dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null }),
    })),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { shop_id: 'test-shop-id' },
  }),
}));

describe('getErrorMessage', () => {
  it('returns message from Error object', () => {
    const error = new Error('Test error message');
    expect(getErrorMessage(error)).toBe('Test error message');
  });

  it('returns string directly', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('returns default message for unknown types', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    expect(getErrorMessage({})).toBe('An unexpected error occurred');
  });
});

describe('useSupabaseCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      useSupabaseCrud({ table: 'customers' })
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.currentPage).toBe(1);
  });

  it('provides CRUD methods', () => {
    const { result } = renderHook(() =>
      useSupabaseCrud({ table: 'customers' })
    );

    expect(typeof result.current.fetchAll).toBe('function');
    expect(typeof result.current.fetchPage).toBe('function');
    expect(typeof result.current.create).toBe('function');
    expect(typeof result.current.update).toBe('function');
    expect(typeof result.current.remove).toBe('function');
    expect(typeof result.current.setPage).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
  });

  it('setPage updates currentPage', () => {
    const { result } = renderHook(() =>
      useSupabaseCrud({ table: 'customers' })
    );

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.currentPage).toBe(3);
  });
});
