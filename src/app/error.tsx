'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (in production, send to error tracking service)
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-text">Something went wrong</h1>
        </div>

        <p className="text-text-muted mb-4">
          We're sorry, but something unexpected happened. Please try again or return to the homepage.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 p-3 bg-muted rounded border border-border">
            <summary className="cursor-pointer font-semibold text-sm text-text mb-2">
              Error Details (Development Only)
            </summary>
            <div className="text-xs font-mono text-text-muted overflow-auto">
              <p className="font-bold mb-1">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-muted-foreground">Error ID: {error.digest}</p>
              )}
              {error.stack && (
                <pre className="whitespace-pre-wrap mt-2 text-xs">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <Button
            onClick={reset}
            className="flex-1"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Link href="/" className="flex-1">
            <Button className="w-full" variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
