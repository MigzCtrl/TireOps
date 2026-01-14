'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send error to Sentry
    Sentry.captureException(error);
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Critical Error
              </h1>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              A critical error occurred. Please refresh the page to continue. If the problem persists, contact support.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <summary className="cursor-pointer font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 overflow-auto">
                  <p className="font-bold mb-1">{error.message}</p>
                  {error.digest && (
                    <p className="mt-2">Error ID: {error.digest}</p>
                  )}
                  {error.stack && (
                    <pre className="whitespace-pre-wrap mt-2 text-xs">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
