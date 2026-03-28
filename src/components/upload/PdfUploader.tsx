"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useValkyrie } from "@/lib/store";
import type { ExtractedData } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SIZE = 50 * 1024 * 1024;

const PROGRESS_STEPS = [
  { label: "Reading balance sheet", pct: 12 },
  { label: "Extracting income statement", pct: 28 },
  { label: "Parsing cash flow statement", pct: 44 },
  { label: "Cross-verifying statements", pct: 60 },
  { label: "Extracting working capital", pct: 74 },
  { label: "Validating extracted data", pct: 88 },
  { label: "Finalising report", pct: 96 },
];

function humanizeError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("timed out") || lower.includes("504") || lower.includes("timeout") || lower.includes("function_invocation_timeout")) {
    return "The report is very large. Extraction timed out — please try a shorter report or try again.";
  }

  if (lower.includes("413") || lower.includes("payload too large") || lower.includes("body exceeded") || lower.includes("entity too large")) {
    return "The PDF is too large for the server to process. Please try a report under 3 MB, or use a compressed version.";
  }

  if (lower.includes("502") || lower.includes("extraction service")) {
    return "The extraction service is temporarily unavailable. Please try again in a few minutes.";
  }

  if (lower.includes("500") || lower.includes("server error")) {
    return "A server error occurred during extraction. Please try again.";
  }

  if (lower.includes("invalid json") || lower.includes("unexpected token")) {
    return "The server returned an unexpected response. Please try again.";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network error") || lower.includes("load failed")) {
    return "Network error — please check your internet connection and try again.";
  }

  return raw;
}

const formatFileSize = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export const PdfUploader = () => {
  const router = useRouter();
  const { setPdfFile, setExtractedData, setStep, setLoading, setError } = useValkyrie();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rejectionMsg, setRejectionMsg] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAnalyzing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setProgressIdx(0);
    intervalRef.current = setInterval(() => {
      setProgressIdx((current) => Math.min(current + 1, PROGRESS_STEPS.length - 1));
    }, 2800);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAnalyzing]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setRejectionMsg(null);
      setInlineError(null);

      if (accepted[0]) {
        setSelectedFile(accepted[0]);
        setPdfFile(accepted[0]);
      }
    },
    [setPdfFile]
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      setSelectedFile(null);
      setPdfFile(null);

      const code = rejections[0]?.errors[0]?.code;
      if (code === "file-too-large") {
        setRejectionMsg("File exceeds 50 MB limit. Please use a smaller PDF.");
      } else if (code === "file-invalid-type") {
        setRejectionMsg("Only PDF files are accepted.");
      } else {
        setRejectionMsg("File rejected. Please try a different PDF.");
      }
    },
    [setPdfFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: isAnalyzing,
  });

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setInlineError(null);
    setIsAnalyzing(true);
    setLoading(true);

    try {
      try {
        const header = await selectedFile.slice(0, 5).text();
        if (!header.startsWith("%PDF")) {
          setInlineError(
            "This file does not appear to be a valid PDF. It may be corrupted or renamed."
          );
          setIsAnalyzing(false);
          setLoading(false);
          return;
        }
      } catch {
        // Proceed and let the API validate the file if needed.
      }

      const base64 = await toBase64(selectedFile);

      // Vercel serverless functions have a ~4.5 MB request body limit.
      // Base64 encoding inflates size by ~33%, so warn early.
      const estimatedPayloadMb = (base64.length * 1.02) / (1024 * 1024);
      if (estimatedPayloadMb > 4.2) {
        throw new Error(
          "413 — PDF payload too large for the server. Please try a compressed or shorter PDF (under ~3 MB)."
        );
      }

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64, filename: selectedFile.name }),
      });

      // Parse response — handle non-JSON responses (e.g., Vercel HTML error pages)
      let raw: unknown;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        raw = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(
            text.includes("FUNCTION_INVOCATION_TIMEOUT")
              ? "504 — Function timed out"
              : `Extraction failed (${response.status})`
          );
        }
        try {
          raw = JSON.parse(text);
        } catch {
          throw new Error(`Extraction failed (${response.status}) — unexpected response format`);
        }
      }

      if (!response.ok) {
        const errorResponse = raw as { error?: string };
        throw new Error(errorResponse.error ?? `Extraction failed (${response.status})`);
      }

      const json = raw as ExtractedData;
      setExtractedData(json);
      setStep("review");
      router.push("/review");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "An unexpected error occurred";
      const message = humanizeError(raw);
      setInlineError(message);
      setError(message);
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPdfFile(null);
    setInlineError(null);
    setRejectionMsg(null);
  };

  const zoneBorderClass = (() => {
    if (rejectionMsg || inlineError || isDragReject) {
      return "border-[var(--valk-loss)] bg-loss";
    }

    if (isDragAccept || isDragActive || selectedFile) {
      return "border-accent bg-accent-muted";
    }

    return "border-subtle bg-surface hover:border-accent hover:bg-surface-alt";
  })();

  const currentStep = PROGRESS_STEPS[progressIdx];

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer overflow-hidden rounded-[var(--valk-radius-lg)] border transition-colors duration-150",
          zoneBorderClass,
          isAnalyzing && "pointer-events-none cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {!selectedFile && !isAnalyzing ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center px-8 py-16 text-center"
            >
              <div
                className={cn(
                  "mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--valk-radius-lg)] border transition-colors duration-150",
                  isDragAccept
                    ? "border-accent bg-accent-muted"
                    : isDragReject || rejectionMsg
                      ? "border-[var(--valk-loss)] bg-loss"
                      : "border-subtle bg-surface-alt"
                )}
              >
                <Upload
                  className={cn(
                    "h-7 w-7 transition-colors",
                    isDragAccept
                      ? "text-accent"
                      : isDragReject || rejectionMsg
                        ? "text-loss"
                        : "text-muted"
                  )}
                  strokeWidth={1.8}
                />
              </div>

              {isDragActive ? (
                <p className="text-body font-medium text-accent">Release to upload</p>
              ) : (
                <>
                  <p className="mb-2 text-title text-primary">Drop your Annual Report PDF here</p>
                  <p className="mb-6 text-body text-secondary">
                    or{" "}
                    <span className="cursor-pointer text-accent underline underline-offset-2">
                      click to browse
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-[var(--valk-radius-sm)] border border-subtle bg-surface-alt px-2 py-1 text-caption text-muted">
                      PDF only
                    </span>
                    <span className="rounded-[var(--valk-radius-sm)] border border-subtle bg-surface-alt px-2 py-1 text-caption text-muted">
                      Up to 50 MB
                    </span>
                    <span className="rounded-[var(--valk-radius-sm)] border border-subtle bg-surface-alt px-2 py-1 text-caption text-muted">
                      Ind AS / IFRS
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          ) : null}

          {selectedFile && !isAnalyzing ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-4 bg-surface-alt px-5 py-5"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--valk-radius-md)] border border-accent bg-accent-muted">
                <FileText className="h-5 w-5 text-accent" strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-primary">{selectedFile.name}</p>
                <p className="mt-1 text-caption text-muted">
                  {formatFileSize(selectedFile.size)} · PDF
                </p>
              </div>

              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-accent" strokeWidth={1.8} />

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleClear();
                }}
                className="flex-shrink-0 rounded-[var(--valk-radius-sm)] p-1.5 text-muted transition-colors duration-150 hover:bg-loss hover:text-loss"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </motion.div>
          ) : null}

          {isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center bg-surface-alt px-8 py-14 text-center"
            >
              <div className="relative mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-subtle bg-surface">
                  <FileText className="h-5 w-5 text-muted" strokeWidth={1.8} />
                </div>
                <Loader2 className="absolute -right-1.5 -top-1.5 h-5.5 w-5.5 animate-spin text-accent" />
              </div>

              <p className="mb-2 text-title font-semibold text-primary">Analysing report</p>

              <AnimatePresence mode="wait">
                <motion.p
                  key={progressIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="mb-5 font-mono text-caption text-accent"
                >
                  {currentStep.label}...
                </motion.p>
              </AnimatePresence>

              <div className="h-1 w-48 overflow-hidden rounded-full bg-tertiary">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  animate={{ width: `${currentStep.pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              <p className="mt-4 text-caption text-muted">
                Large reports may take up to 2 minutes
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {rejectionMsg || inlineError ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex items-start gap-3 rounded-[var(--valk-radius-md)] border border-[var(--valk-loss)] bg-loss px-4 py-3"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-loss" strokeWidth={1.8} />
            <p className="flex-1 text-caption text-loss">{rejectionMsg ?? inlineError}</p>
            <button
              onClick={() => {
                setRejectionMsg(null);
                setInlineError(null);
              }}
              className="flex-shrink-0 text-muted transition-colors duration-150 hover:text-loss"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" strokeWidth={1.8} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFile && !isAnalyzing ? (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={handleAnalyze}
            className="valk-button-primary group mt-4 w-full"
          >
            Analyse Report
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <p className="mt-4 text-center text-caption text-disabled">
        Processed securely · Never stored permanently
      </p>
    </div>
  );
};
