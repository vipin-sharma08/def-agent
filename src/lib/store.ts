// src/lib/store.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — Zustand Global State Store
// ═══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import type {
  Step,
  ExtractedData,
  UserAssumptions,
  FinancialModel,
} from "@/lib/types";

// ─── State Shape ──────────────────────────────────────────────────

interface ValkyrieState {
  // Data
  currentStep: Step;
  pdfFile: File | null;
  extractedData: ExtractedData | null;
  userAssumptions: UserAssumptions | null;
  financialModel: FinancialModel | null;

  // UI
  isLoading: boolean;
  error: string | null;

  // Actions
  setPdfFile: (file: File | null) => void;
  setExtractedData: (data: ExtractedData | null) => void;
  setUserAssumptions: (assumptions: UserAssumptions | null) => void;
  setFinancialModel: (model: FinancialModel | null) => void;
  setStep: (step: Step) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────

const initialState = {
  currentStep: "upload" as Step,
  pdfFile: null,
  extractedData: null,
  userAssumptions: null,
  financialModel: null,
  isLoading: false,
  error: null,
} satisfies Omit<ValkyrieState, keyof Record<`set${string}` | "reset", unknown>>;

// ─── Store ────────────────────────────────────────────────────────

export const useValkyrie = create<ValkyrieState>()((set) => ({
  ...initialState,

  setPdfFile: (file) => set({ pdfFile: file, error: null }),

  setExtractedData: (data) => set({ extractedData: data }),

  setUserAssumptions: (assumptions) => set({ userAssumptions: assumptions }),

  setFinancialModel: (model) => set({ financialModel: model }),

  setStep: (step) => set({ currentStep: step }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),
}));

// ─── Selectors (pre-bound for convenience) ────────────────────────

export const selectCurrentStep = (s: ValkyrieState) => s.currentStep;
export const selectPdfFile = (s: ValkyrieState) => s.pdfFile;
export const selectExtractedData = (s: ValkyrieState) => s.extractedData;
export const selectUserAssumptions = (s: ValkyrieState) => s.userAssumptions;
export const selectFinancialModel = (s: ValkyrieState) => s.financialModel;
export const selectIsLoading = (s: ValkyrieState) => s.isLoading;
export const selectError = (s: ValkyrieState) => s.error;
