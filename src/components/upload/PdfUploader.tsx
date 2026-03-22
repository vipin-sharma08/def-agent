"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useValkyrie } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ExtractedData } from "@/lib/types";
import { normalizeExtractedData } from "@/lib/normalizeExtractedData";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const PROGRESS_STEPS = [
  { label: "Reading balance sheet",         pct: 12 },
  { label: "Extracting income statement",   pct: 28 },
  { label: "Parsing cash flow statement",   pct: 44 },
  { label: "Cross-verifying statements",    pct: 60 },
  { label: "Extracting working capital",    pct: 74 },
  { label: "Validating extracted data",     pct: 88 },
  { label: "Finalising report",             pct: 96 },
];

function humanizeError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("timed out") || lower.includes("504") || lower.includes("timeout"))
    return "The report is very large. Extraction timed out — please try a shorter report or try again.";
  if (lower.includes("502") || lower.includes("extraction service"))
    return "The extraction service is temporarily unavailable. Please try again in a few minutes.";
  if (lower.includes("500") || lower.includes("server error"))
    return "A server error occurred during extraction. Please try again.";
  if (lower.includes("invalid json") || lower.includes("unexpected token"))
    return "The server returned an unexpected response. Please try again.";
  return raw;
}

const formatFileSize = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

// ─── Component ────────────────────────────────────────────────────

export const PdfUploader = () => {
  const router = useRouter();
  const { setPdfFile, setExtractedData, setStep, setLoading, setError } = useValkyrie();

  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [rejectionMsg, setRejectionMsg]   = useState<string | null>(null);
  const [isAnalyzing,  setIsAnalyzing]    = useState(false);
  const [progressIdx,  setProgressIdx]    = useState(0);
  const [inlineError,  setInlineError]    = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Advance progress step on a timer while analyzing
  useEffect(() => {
    if (isAnalyzing) {
      setProgressIdx(0);
      intervalRef.current = setInterval(() => {
        setProgressIdx((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
      }, 2800);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAnalyzing]);

  const onDrop = useCallback((accepted: File[]) => {
    setRejectionMsg(null);
    setInlineError(null);
    if (accepted[0]) { setSelectedFile(accepted[0]); setPdfFile(accepted[0]); }
  }, [setPdfFile]);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setSelectedFile(null);
    setPdfFile(null);
    const code = rejections[0]?.errors[0]?.code;
    if (code === "file-too-large")   setRejectionMsg("File exceeds 50 MB limit. Please use a smaller PDF.");
    else if (code === "file-invalid-type") setRejectionMsg("Only PDF files are accepted.");
    else setRejectionMsg("File rejected. Please try a different PDF.");
  }, [setPdfFile]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } =
    useDropzone({
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
      // PDF magic-byte sanity check
      try {
        const header = await selectedFile.slice(0, 5).text();
        if (!header.startsWith("%PDF")) {
          setInlineError("This file doesn't appear to be a valid PDF. It may be corrupted or renamed.");
          setIsAnalyzing(false);
          setLoading(false);
          return;
        }
      } catch { /* proceed — API will catch it */ }

      const base64 = await toBase64(selectedFile);
      const res    = await fetch("/api/extract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pdf: base64, filename: selectedFile.name }),
      });

      const raw = (await res.json()) as unknown;
      // Narrow error responses before normalizing
      if (!res.ok) {
        const errObj = raw as { error?: string };
        throw new Error(errObj.error ?? `Extraction failed (${res.status})`);
      }

      const json: ExtractedData = normalizeExtractedData(raw);
      setExtractedData(json);
      setStep("review");
      router.push("/review");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "An unexpected error occurred";
      const msg = humanizeError(raw);
      setInlineError(msg);
      setError(msg);
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

  // ── Border style based on drag state ──
  const zoneBorderClass = (() => {
    if (rejectionMsg || inlineError || isDragReject)
      return "border-negative/50 bg-neg-surface";
    if (isDragAccept || isDragActive)
      return "border-teal bg-teal-surface";
    if (selectedFile)
      return "border-teal/40 bg-teal-surface";
    return "border-border-strong hover:border-teal/30 hover:bg-teal-surface/50";
  })();

  const currentStep = PROGRESS_STEPS[progressIdx];

  return (
    <div className="w-full">
      {/* ── Drop zone ── */}
      <div
        {...getRootProps()}
        className={cn(
          "upload-zone cursor-pointer transition-all duration-200",
          zoneBorderClass,
          isAnalyzing && "cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">

          {/* Idle state */}
          {!selectedFile && !isAnalyzing && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-16 px-8 text-center"
            >
              <div
                className={cn(
                  "mb-5 p-5 rounded-2xl border transition-all duration-200",
                  isDragAccept
                    ? "bg-teal-surface border-teal-border"
                    : isDragReject || rejectionMsg
                    ? "bg-neg-surface border-neg-border"
                    : "bg-surface border-border"
                )}
              >
                <Upload
                  size={28}
                  className={cn(
                    "transition-colors",
                    isDragAccept ? "text-teal" : isDragReject || rejectionMsg ? "text-negative" : "text-zinc-600"
                  )}
                />
              </div>

              {isDragActive ? (
                <p className="text-base font-semibold text-teal">
                  Release to upload
                </p>
              ) : (
                <>
                  <p className="text-[15px] font-semibold text-zinc-100 mb-1.5">
                    Drop your Annual Report PDF here
                  </p>
                  <p className="text-sm text-zinc-600 mb-6">
                    or{" "}
                    <span className="text-teal underline underline-offset-2 cursor-pointer">
                      click to browse
                    </span>
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-700">
                    <span className="px-2 py-1 rounded-md border border-border bg-elevated">PDF only</span>
                    <span className="px-2 py-1 rounded-md border border-border bg-elevated">Up to 50 MB</span>
                    <span className="px-2 py-1 rounded-md border border-border bg-elevated">Ind AS / IFRS</span>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* File selected */}
          {selectedFile && !isAnalyzing && (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-4 px-6 py-5"
            >
              <div className="p-3 rounded-xl bg-teal-surface border border-teal-border flex-shrink-0">
                <FileText size={22} className="text-teal" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{selectedFile.name}</p>
                <p className="text-xs font-mono text-zinc-600 mt-0.5">
                  {formatFileSize(selectedFile.size)} · PDF
                </p>
              </div>

              <CheckCircle2 size={16} className="text-teal flex-shrink-0" />

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="p-1.5 rounded-md text-zinc-600 hover:text-negative hover:bg-neg-surface transition-colors flex-shrink-0"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}

          {/* Analyzing */}
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-14 px-8 text-center"
            >
              {/* Spinner ring */}
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center">
                  <FileText size={20} className="text-zinc-600" />
                </div>
                <Loader2
                  size={22}
                  className="absolute -top-1.5 -right-1.5 text-teal animate-spin"
                />
              </div>

              <p className="text-sm font-semibold text-zinc-100 mb-1">
                Analysing report
              </p>

              {/* Progress message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={progressIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs font-mono text-teal/70 mb-5"
                >
                  {currentStep.label}...
                </motion.p>
              </AnimatePresence>

              {/* Progress bar */}
              <div className="w-48 h-0.5 bg-elevated rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-teal rounded-full"
                  animate={{ width: `${currentStep.pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              <p className="text-[11px] text-zinc-700 mt-4 font-mono">
                Large reports may take up to 2 minutes
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Error messages ── */}
      <AnimatePresence>
        {(rejectionMsg || inlineError) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl border border-neg-border bg-neg-surface"
          >
            <AlertCircle size={14} className="text-negative flex-shrink-0 mt-0.5" />
            <p className="text-xs text-negative/80 flex-1 leading-relaxed">
              {rejectionMsg ?? inlineError}
            </p>
            <button
              onClick={() => { setRejectionMsg(null); setInlineError(null); }}
              className="text-zinc-600 hover:text-negative transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Analyse CTA ── */}
      <AnimatePresence>
        {selectedFile && !isAnalyzing && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={handleAnalyze}
            className="mt-4 w-full group relative py-3.5 px-6 rounded-xl bg-teal hover:bg-teal-bright text-base font-semibold text-[#0A0A0A] transition-colors duration-200 glow-teal flex items-center justify-center gap-2"
          >
            Analyse Report
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </motion.button>
        )}
      </AnimatePresence>

      <p className="mt-3 text-center text-[11px] text-zinc-700 font-mono">
        Processed securely · Never stored permanently
      </p>
    </div>
  );
};
