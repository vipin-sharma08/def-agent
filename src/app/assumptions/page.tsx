"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { AssumptionsForm } from "@/components/dcf/AssumptionsForm";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Button } from "@/components/ui/button";
import { useValkyrie } from "@/lib/store";
import type { UserAssumptions } from "@/lib/types";

export default function AssumptionsPage() {
  const router = useRouter();
  const { extractedData, isLoading, setStep, setUserAssumptions } = useValkyrie();

  const handleSubmit = (assumptions: UserAssumptions) => {
    setUserAssumptions(assumptions);
    setStep("report");
    router.push("/report");
  };

  if (!extractedData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 xl:px-0">
        <div className="card flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--valk-radius-lg)] border border-subtle bg-surface-alt text-muted">
            <AlertCircle className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div className="space-y-2">
            <p className="text-heading text-primary">Assumptions unavailable</p>
            <p className="text-body text-secondary">
              Extracted financials are required before building the DCF model.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => router.push("/review")}
            className="min-h-10 rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt px-4 text-body text-primary hover:bg-hover"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back to Review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mx-auto max-w-[1160px] space-y-6 px-4 py-8 xl:px-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <StepIndicator icon={SlidersHorizontal} step={3} />
          <h1 className="text-display text-primary">DCF Assumptions</h1>
          <p className="text-body text-secondary">
            Build the model using restrained, India-native forecast inputs.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => router.push("/review")}
          className="min-h-10 rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt px-4 text-body text-primary hover:bg-hover"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Review Financials
        </Button>
      </div>

      <AssumptionsForm
        extractedData={extractedData}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    </motion.div>
  );
}
