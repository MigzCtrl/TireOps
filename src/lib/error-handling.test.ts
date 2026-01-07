import { describe, it, expect, vi } from 'vitest';
import {
  parseError,
  getUserFriendlyMessage,
  tryCatch,
  type AppError,
} from './error-handling';

describe('parseError', () => {
  it('parses standard Error objects', () => {
    const error = new Error('Test error');
    const result = parseError(error);

    expect(result.type).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Test error');
    expect(result.originalError).toBe(error);
  });

  it('parses network errors', () => {
    const error = new Error('fetch failed');
    const result = parseError(error);

    expect(result.type).toBe('NETWORK_ERROR');
    expect(result.message).toContain('internet connection');
  });

  it('parses string errors', () => {
    const result = parseError('Simple string error');

    expect(result.type).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Simple string error');
  });

  it('handles null/undefined gracefully', () => {
    expect(parseError(null).type).toBe('UNKNOWN_ERROR');
    expect(parseError(undefined).type).toBe('UNKNOWN_ERROR');
  });

  it('parses Supabase auth errors', () => {
    const supabaseError = {
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    };
    const result = parseError(supabaseError);

    expect(result.type).toBe('AUTH_ERROR');
    expect(result.message).toBe('Invalid email or password');
    expect(result.code).toBe('invalid_credentials');
  });

  it('parses Supabase permission errors', () => {
    const supabaseError = {
      code: '42501',
      message: 'permission denied for table customers',
    };
    const result = parseError(supabaseError);

    expect(result.type).toBe('PERMISSION_DENIED');
  });

  it('parses Supabase not found errors', () => {
    const supabaseError = {
      code: 'PGRST116',
      message: 'The result contains 0 rows',
    };
    const result = parseError(supabaseError);

    expect(result.type).toBe('NOT_FOUND');
  });

  it('parses unique constraint violations', () => {
    const supabaseError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    };
    const result = parseError(supabaseError);

    expect(result.type).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('This item already exists');
  });
});

describe('getUserFriendlyMessage', () => {
  it('returns appropriate message for network errors', () => {
    const error: AppError = {
      type: 'NETWORK_ERROR',
      message: 'fetch failed',
    };
    const message = getUserFriendlyMessage(error);
    expect(message).toContain('internet connection');
  });

  it('returns original message for auth errors', () => {
    const error: AppError = {
      type: 'AUTH_ERROR',
      message: 'Invalid email or password',
    };
    expect(getUserFriendlyMessage(error)).toBe('Invalid email or password');
  });

  it('returns friendly message for not found errors', () => {
    const error: AppError = {
      type: 'NOT_FOUND',
      message: 'PGRST116',
    };
    expect(getUserFriendlyMessage(error)).toContain('could not be found');
  });

  it('returns friendly message for permission errors', () => {
    const error: AppError = {
      type: 'PERMISSION_DENIED',
      message: '42501',
    };
    expect(getUserFriendlyMessage(error)).toContain('permission');
  });
});

describe('tryCatch', () => {
  it('returns data on success', async () => {
    const result = await tryCatch(async () => 'success');

    expect(result.data).toBe('success');
    expect(result.error).toBe(null);
  });

  it('returns error on failure', async () => {
    const result = await tryCatch(async () => {
      throw new Error('Test failure');
    });

    expect(result.data).toBe(null);
    expect(result.error).not.toBe(null);
    expect(result.error?.message).toBe('Test failure');
  });

  it('handles async operations correctly', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { id: 1, name: 'Test' };
    };

    const result = await tryCatch(asyncFn);

    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.error).toBe(null);
  });
});
