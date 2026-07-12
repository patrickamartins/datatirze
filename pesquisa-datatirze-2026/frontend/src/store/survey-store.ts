import { create } from "zustand";
import type { PesquisaConfig, PesquisaRespostas } from "@/types/pesquisa";

interface SurveyState {
  config: PesquisaConfig | null;
  sessionToken: string | null;
  currentStep: number;
  respostas: PesquisaRespostas;
  status: string;
  isSaving: boolean;
  lastSaved: Date | null;
  setConfig: (config: PesquisaConfig) => void;
  setSession: (token: string, step: number, respostas: PesquisaRespostas, status: string) => void;
  updateRespostas: (partial: PesquisaRespostas) => void;
  setStep: (step: number) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  reset: () => void;
}

export const useSurveyStore = create<SurveyState>((set) => ({
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
  updateRespostas: (partial) =>
    set((state) => ({ respostas: { ...state.respostas, ...partial } })),
  setStep: (step) => set({ currentStep: step }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (date) => set({ lastSaved: date }),
  reset: () =>
    set({
      sessionToken: null,
      currentStep: 1,
      respostas: {},
      status: "in_progress",
      isSaving: false,
      lastSaved: null,
    }),
}));
