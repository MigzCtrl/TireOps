"use client";

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UseCrudOptions<T> {
  table: string;
  orderBy?: { column: string; ascending?: boolean };
  select?: string;
  pageSize?: number;
}

interface CrudState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
}

interface CrudOperations<T> {
  fetchAll: () => Promise<void>;
  fetchPage: (page: number) => Promise<void>;
  create: (item: Partial<T>) => Promise<T | null>;
  update: (id: string, updates: Partial<T>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

export function useSupabaseCrud<T extends { id: string }>(
  options: UseCrudOptions<T>
): CrudState<T> & CrudOperations<T> {
  const { table, orderBy, select = '*', pageSize = 25 } = options;
  const { profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [state, setState] = useState<CrudState<T>>({
    data: [],
    loading: true,
    error: null,
    totalCount: 0,
    currentPage: 1,
  });

  const handleError = useCallback((error: Error | unknown, operation: string) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error(`${operation} error:`, error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: `Failed to ${operation}`,
    });
    setState(prev => ({ ...prev, error: message, loading: false }));
  }, [toast]);

  const fetchAll = useCallback(async () => {
    if (!profile?.shop_id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let query = supabase
        .from(table)
        .select(select, { count: 'exact' })
        .eq('shop_id', profile.shop_id);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setState(prev => ({
        ...prev,
        data: (data || []) as unknown as T[],
        totalCount: count || 0,
        loading: false,
        error: null,
      }));
    } catch (error) {
      handleError(error, 'load data');
    }
  }, [profile?.shop_id, table, select, orderBy, supabase, handleError]);

  const fetchPage = useCallback(async (page: number) => {
    if (!profile?.shop_id) return;

    setState(prev => ({ ...prev, loading: true, error: null, currentPage: page }));

    try {
      // Get count first
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', profile.shop_id);

      if (countError) throw countError;

      // Get paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(table)
        .select(select)
        .eq('shop_id', profile.shop_id)
        .range(from, to);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data, error } = await query;

      if (error) throw error;

      setState(prev => ({
        ...prev,
        data: (data || []) as unknown as T[],
        totalCount: count || 0,
        currentPage: page,
        loading: false,
        error: null,
      }));
    } catch (error) {
      handleError(error, 'load page');
    }
  }, [profile?.shop_id, table, select, orderBy, pageSize, supabase, handleError]);

  const create = useCallback(async (item: Partial<T>): Promise<T | null> => {
    if (!profile?.shop_id) return null;

    try {
      const { data, error } = await supabase
        .from(table)
        .insert([{ ...item, shop_id: profile.shop_id }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Item created successfully',
      });

      return data as T;
    } catch (error) {
      handleError(error, 'create item');
      return null;
    }
  }, [profile?.shop_id, table, supabase, toast, handleError]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<boolean> => {
    if (!profile?.shop_id) return false;

    try {
      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Item updated successfully',
      });

      return true;
    } catch (error) {
      handleError(error, 'update item');
      return false;
    }
  }, [profile?.shop_id, table, supabase, toast, handleError]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!profile?.shop_id) return false;

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Item deleted successfully',
      });

      return true;
    } catch (error) {
      handleError(error, 'delete item');
      return false;
    }
  }, [profile?.shop_id, table, supabase, toast, handleError]);

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchPage(state.currentPage);
  }, [fetchPage, state.currentPage]);

  return {
    ...state,
    fetchAll,
    fetchPage,
    create,
    update,
    remove,
    setPage,
    refresh,
  };
}

// Type-safe error handler utility
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
