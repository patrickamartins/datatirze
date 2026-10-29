import { create } from "zustand";
import type { PesquisaConfigE2, PesquisaRespostasE2 } from "@/types/pesquisa-e2";

interface SurveyE2State {
  config: PesquisaConfigE2 | null;
  sessionToken: string | null;
  currentStep: number;
  respostas: PesquisaRespostasE2;
  status: string;
  isSaving: boolean;
  lastSaved: Date | null;
  setConfig: (config: PesquisaConfigE2) => void;
  setSession: (token: string, step: number, respostas: PesquisaRespostasE2, status: string) => void;
  setSessionToken: (token: string) => void;
  updateRespostas: (partial: PesquisaRespostasE2) => void;
  setStep: (step: number) => void;
  setSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date) => void;
}

export const useSurveyE2Store = create<SurveyE2State>((set) => ({
  config: null,
  sessionToken: null,
  currentStep: 1,
  respostas: {},
  status: "in_progress",
  isSaving: false,
  lastSaved: null,
  setConfig: (config) => set({ config }),
  setSession: (token, step, respostas, status) =>
    set({ sessionToken: token, currentStep: step, respostas, status }),
  setSessionToken: (token) => set({ sessionToken: token }),
  updateRespostas: (partial) => set((state) => ({ respostas: { ...state.respostas, ...partial } })),
  setStep: (step) => set({ currentStep: step }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (date) => set({ lastSaved: date }),
}));
