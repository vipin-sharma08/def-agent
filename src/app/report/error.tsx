"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Report Error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="card flex flex-col items-center p-10 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-loss border border-loss">
          <AlertTriangle size={28} className="text-loss" />
        </div>
        <h2 className="mb-2 text-title text-primary">Report Error</h2>
        <p className="mb-6 max-w-md text-body text-secondary">
          Something went wrong while rendering the report. This usually happens
          when the AI model returns data in an unexpected format.
        </p>
        {error.message && (
          <pre className="mb-6 max-w-full overflow-x-auto rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt px-4 py-3 text-left text-[11px] font-mono text-muted leading-relaxed">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3">
          <a
            href="/assumptions"
            className="valk-button-secondary"
          >
            <ArrowLeft size={14} />
            Back to Assumptions
          </a>
          <button onClick={reset} className="valk-button-primary">
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
