"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

interface DCFResult {
  status: string;
  company: string;
  intrinsicValuePerShare: number;
  enterpriseValue: number;
  error?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [result, setResult] = useState<DCFResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setErrorMsg("");
      setUploadState("idle");
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") {
      setFile(selected);
      setErrorMsg("");
      setUploadState("idle");
    }
  }

  function removeFile() {
    setFile(null);
    setErrorMsg("");
    setUploadState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file || uploadState === "uploading") return;
    setUploadState("uploading");
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Upload failed. Please try again.");
        setUploadState("error");
      } else {
        setResult(data);
        setUploadState("success");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error. Please try again.");
      setUploadState("error");
    }
  }

  function reset() {
    setFile(null);
    setUploadState("idle");
    setResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : "0";

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-lg tracking-wide">VALKYRIE</span>
        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">DCF</span>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2 mb-6 border border-gray-700 rounded-full px-4 py-1.5">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        <span className="text-gray-400 text-xs tracking-widest font-medium">
          AI-POWERED · INDIAN EQUITIES · FCFF METHOD
        </span>
      </div>

      {/* Headline */}
      <div className="text-center mb-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
          Institutional-grade DCF
        </h1>
        <h1 className="text-4xl sm:text-5xl font-bold text-blue-400 leading-tight">
          for Indian equities
        </h1>
      </div>

      {/* Subtext */}
      <p className="text-gray-400 text-center text-base mb-8 max-w-lg leading-relaxed">
        Upload an annual report. Valkyrie extracts every financial statement,
        builds an integrated 3-statement model, and runs a rigorous FCFF-based
        DCF — in minutes.
      </p>

      <div className="w-full max-w-lg space-y-3">
        {/* File upload area */}
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragging ? "border-blue-500 bg-blue-950/20" : "border-gray-700 hover:border-gray-500"}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <svg
              className="mx-auto mb-3 h-8 w-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-400 font-medium text-sm">
              Drop annual report PDF here, or click to browse
            </p>
          </div>
        ) : (
          <div className="border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 bg-gray-900/50">
            <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
              <p className="text-gray-500 text-xs">{fileSizeMB} MB · PDF</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {uploadState === "uploading" ? (
                <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <button onClick={removeFile} className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {uploadState === "error" && errorMsg && (
          <div className="border border-red-800 bg-red-950/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-300 text-sm flex-1">{errorMsg}</p>
            <button onClick={() => { setErrorMsg(""); setUploadState("idle"); }} className="text-red-500 hover:text-red-300 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Success result */}
        {uploadState === "success" && result && (
          <div className="border border-green-800 bg-green-950/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd" />
              </svg>
              DCF Complete — {result.company}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/60 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Intrinsic Value / Share</p>
                <p className="text-2xl font-bold text-white mt-1">₹{fmt(result.intrinsicValuePerShare)}</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Enterprise Value</p>
                <p className="text-2xl font-bold text-white mt-1">₹{fmt(result.enterpriseValue)}</p>
              </div>
            </div>
            <button onClick={reset} className="text-sm text-blue-400 hover:text-blue-300 underline">
              Analyse another report
            </button>
          </div>
        )}

        {/* Submit button */}
        {uploadState !== "success" && (
          <button
            onClick={handleSubmit}
            disabled={!file || uploadState === "uploading"}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600
              text-white font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
          >
            {uploadState === "uploading" ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analysing — this may take 1–2 min…
              </>
            ) : (
              <>
                Analyse Report
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="mt-10 text-gray-700 text-xs">
        Processed securely · Never stored permanently
      </p>
    </main>
  );
}
