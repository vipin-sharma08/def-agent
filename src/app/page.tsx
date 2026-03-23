"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface DCFResult {
  status: string;
  company: string;
  intrinsicValuePerShare: number;
  enterpriseValue: number;
  error?: string;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [result, setResult] = useState<DCFResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") setFile(selected);
  }

  async function handleSubmit() {
    if (!file) return;
    setUploadState("uploading");
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    if (email) formData.append("email", email);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Upload failed");
        setUploadState("error");
      } else {
        setResult(data);
        setUploadState("success");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setUploadState("error");
    }
  }

  function reset() {
    setFile(null);
    setEmail("");
    setUploadState("idle");
    setResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Valkyrie DCF
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          Upload an annual report PDF — Gemini extracts the data, we run the
          DCF.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-5">
        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragging ? "border-blue-500 bg-blue-950/30" : "border-gray-700 hover:border-gray-500"}
            ${file ? "border-green-600 bg-green-950/20" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <div>
              <p className="text-green-400 font-medium">{file.name}</p>
              <p className="text-gray-500 text-xs mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto mb-3 h-10 w-10 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-400 font-medium">
                Drop annual report PDF here
              </p>
              <p className="text-gray-600 text-xs mt-1">or click to browse</p>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Email (optional — receive report via Gmail)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!file || uploadState === "uploading"}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600
            text-white font-semibold py-3 transition-colors"
        >
          {uploadState === "uploading" ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Processing — this may take 30–60 s…
            </span>
          ) : (
            "Run DCF Analysis"
          )}
        </button>

        {/* Result */}
        {uploadState === "success" && result && (
          <div className="rounded-xl bg-gray-900 border border-green-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              DCF Complete — {result.company}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Intrinsic Value / Share
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  ₹{fmt(result.intrinsicValuePerShare)}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Enterprise Value
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  ₹{fmt(result.enterpriseValue)}
                </p>
              </div>
            </div>

            {email && (
              <p className="text-gray-500 text-xs">
                Full report sent to {email}
              </p>
            )}

            <button
              onClick={reset}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Analyze another report
            </button>
          </div>
        )}

        {/* Error */}
        {uploadState === "error" && (
          <div className="rounded-xl bg-gray-900 border border-red-800 p-5">
            <p className="text-red-400 font-medium text-sm">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <p className="mt-12 text-gray-700 text-xs">
        Powered by Gemini · n8n · Google Sheets
      </p>
    </main>
  );
}
