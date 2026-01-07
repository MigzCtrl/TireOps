/**
 * Centralized error handling utilities for the tire shop application
 */

// Error types for different scenarios
export type ErrorType =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  code?: string;
}

/**
 * Parse and categorize errors from various sources
 */
export function parseError(error: unknown): AppError {
  // Handle Supabase errors
  if (isSupabaseError(error)) {
    return parseSupabaseError(error);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Unable to connect. Please check your internet connection.',
        originalError: error,
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: error.message,
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: 'UNKNOWN_ERROR',
      message: error,
    };
  }

  // Default fallback
  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  };
}

/**
 * Check if error is a Supabase error
 */
function isSupabaseError(error: unknown): error is { code: string; message: string; details?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Parse Supabase-specific errors
 */
function parseSupabaseError(error: { code: string; message: string; details?: string }): AppError {
  const { code, message, details } = error;

  // Authentication errors
  if (code === 'invalid_credentials' || code === 'invalid_grant') {
    return {
      type: 'AUTH_ERROR',
      message: 'Invalid email or password',
      code,
      originalError: error,
    };
  }

  if (code === 'user_not_found') {
    return {
      type: 'AUTH_ERROR',
      message: 'No account found with this email',
      code,
      originalError: error,
    };
  }

  if (code === 'email_not_confirmed') {
    return {
      type: 'AUTH_ERROR',
      message: 'Please confirm your email address before signing in',
      code,
      originalError: error,
    };
  }

  // Permission errors
  if (code === '42501' || message.includes('permission denied')) {
    return {
      type: 'PERMISSION_DENIED',
      message: 'You do not have permission to perform this action',
      code,
      originalError: error,
    };
  }

  // Not found errors
  if (code === 'PGRST116' || message.includes('not found')) {
    return {
      type: 'NOT_FOUND',
      message: 'The requested item was not found',
      code,
      originalError: error,
    };
  }

  // Unique constraint violations
  if (code === '23505') {
    return {
      type: 'VALIDATION_ERROR',
      message: 'This item already exists',
      code,
      originalError: error,
    };
  }

  // Foreign key violations
  if (code === '23503') {
    return {
      type: 'VALIDATION_ERROR',
      message: 'Cannot complete action due to related records',
      code,
      originalError: error,
    };
  }

  // Default database error
  return {
    type: 'DATABASE_ERROR',
    message: message || 'A database error occurred',
    code,
    originalError: error,
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'AUTH_ERROR':
      return error.message;
    case 'VALIDATION_ERROR':
      return error.message;
    case 'NOT_FOUND':
      return 'The item you are looking for could not be found.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to perform this action.';
    case 'DATABASE_ERROR':
      return 'A database error occurred. Please try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log error for debugging (in development)
 */
export function logError(error: AppError, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`Error${context ? ` in ${context}` : ''}`);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.originalError) console.error('Original:', error.originalError);
    console.groupEnd();
  } else {
    // In production, you might want to send to an error tracking service
    console.error(`[${error.type}] ${error.message}`);
  }
}

/**
 * Async wrapper for consistent error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    const error = parseError(e);
    logError(error, context);
    return { data: null, error };
  }
}
