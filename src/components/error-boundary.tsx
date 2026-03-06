"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback — ReactNode or render function receiving error + reset */
  fallback?: React.ReactNode | ((props: { error: Error; reset: () => void }) => React.ReactNode);
  /** Variant controls sizing: "page" for full-page, "inline" for embedded */
  variant?: "page" | "inline";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// ErrorBoundary (class component — React requirement)
// ---------------------------------------------------------------------------

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log for debugging / future Sentry integration (Fase 4)
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const { fallback, variant = "inline" } = this.props;
    const { error } = this.state;

    // Custom fallback
    if (fallback) {
      if (typeof fallback === "function") {
        return fallback({ error, reset: this.handleReset });
      }
      return fallback;
    }

    // Default fallback UI
    return <DefaultFallback error={error} reset={this.handleReset} variant={variant} />;
  }
}

// ---------------------------------------------------------------------------
// DefaultFallback — Dark Academia styled
// ---------------------------------------------------------------------------

function DefaultFallback({
  error,
  reset,
  variant = "inline",
}: {
  error: Error;
  reset: () => void;
  variant?: "page" | "inline";
}) {
  const isPage = variant === "page";

  const content = (
    <Card className="border-red-900/30 bg-gray-900/80 backdrop-blur-sm max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-red-400 text-lg">
          Algo deu errado
        </CardTitle>
        <CardDescription className="text-gray-400">
          {error.message || "Ocorreu um erro inesperado."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">
          Se o problema persistir, tente recarregar a pagina.
        </p>
      </CardContent>
      <CardFooter className="gap-3">
        <Button onClick={reset} variant="outline" size="sm">
          Tentar novamente
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="ghost"
          size="sm"
          className="text-gray-400"
        >
          Recarregar pagina
        </Button>
      </CardFooter>
    </Card>
  );

  if (isPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6">
      {content}
    </div>
  );
}

export default ErrorBoundary;
