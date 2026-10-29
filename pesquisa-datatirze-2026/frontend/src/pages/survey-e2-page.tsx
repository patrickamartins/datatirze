import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressBarE2 } from "@/components/progress-bar-e2";
import {
  StepCompraE2,
  StepConclusaoE2,
  StepExperienciaE2,
  StepMarketingE2,
  StepPeptideosE2,
  StepPerfilE2,
  StepSaudeE2,
} from "@/components/survey-e2-steps";
import { completeSession, createSession, fetchConfig, fetchSession, saveSession } from "@/lib/api";
import {
  buildShuffleStateE2,
  EDICAO_E2,
  getProgressMessageE2,
  getProgressPercentE2,
  getStepLabelE2,
  getVisibleStepsE2,
  pruneInvisibleAnswersE2,
  SESSION_KEY_E2,
  STEP_E2,
} from "@/lib/survey-e2";
import { validateStepE2 } from "@/lib/validation-e2";
import { useSurveyE2Store } from "@/store/survey-e2-store";
import type { PesquisaConfigE2, PesquisaRespostasE2 } from "@/types/pesquisa-e2";

const AUTOSAVE_DELAY_MS = 800;

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToFirstError() {
  window.setTimeout(() => {
    document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}

export function SurveyE2Page() {
  const {
    config,
    sessionToken,
    currentStep,
    respostas,
    status,
    isSaving,
    lastSaved,
    setConfig,
    setSession,
    setSessionToken,
    updateRespostas,
    setStep,
    setSaving,
    setLastSaved,
  } = useSurveyE2Store();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const isCompleted = status === "completed" || currentStep === STEP_E2.CONCLUSAO;
  const visibleSteps = getVisibleStepsE2(respostas.situacaoUso);
  const rawIndex = visibleSteps.indexOf(currentStep);
  // Se a situação mudou e a etapa atual deixou de existir, usa a próxima aplicável
  const stepIndex = rawIndex >= 0 ? rawIndex : Math.max(0, visibleSteps.findIndex((step) => step > currentStep));
  const isLastStep = stepIndex === visibleSteps.length - 1;

  const init = useCallback(async () => {
    try {
      const loadedConfig = await fetchConfig<PesquisaConfigE2>();
      setConfig(loadedConfig);

      let token: string | null = null;
      let step = 1;
      let loadedRespostas: PesquisaRespostasE2 = {};

      const savedToken = localStorage.getItem(SESSION_KEY_E2);
      if (savedToken) {
        try {
          const sessao = await fetchSession<PesquisaRespostasE2>(savedToken);
          if (sessao.status !== "completed") {
            token = sessao.sessionToken;
            step = Math.min(Math.max(sessao.currentStep || 1, 1), STEP_E2.MARKETING);
            loadedRespostas = sessao.respostas ?? {};
            setSession(token, step, loadedRespostas, sessao.status);
          } else {
            localStorage.removeItem(SESSION_KEY_E2);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY_E2);
        }
      }

      if (!token) {
        const nova = await createSession<PesquisaRespostasE2>(EDICAO_E2);
        token = nova.sessionToken;
        loadedRespostas = nova.respostas ?? {};
        localStorage.setItem(SESSION_KEY_E2, token);
        setSession(token, nova.currentStep || 1, loadedRespostas, nova.status);
        step = nova.currentStep || 1;
      }

      // Embaralhamento feito uma única vez por sessão e persistido em respostas.optionOrder
      const shuffleState = buildShuffleStateE2(loadedConfig, loadedRespostas);
      if (shuffleState) {
        updateRespostas(shuffleState);
        saveSession<PesquisaRespostasE2>(token, {
          currentStep: step,
          respostas: { ...loadedRespostas, ...shuffleState },
        }).catch((error) => console.error("Erro ao salvar ordem das opções:", error));
      }
    } catch (error) {
      setInitError(error instanceof Error ? error.message : "Erro ao iniciar a pesquisa");
    } finally {
      setIsLoading(false);
    }
  }, [setConfig, setSession, updateRespostas]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionToken) return sessionToken;
    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = createSession<PesquisaRespostasE2>(EDICAO_E2)
        .then((nova) => {
          localStorage.setItem(SESSION_KEY_E2, nova.sessionToken);
          setSessionToken(nova.sessionToken);
          return nova.sessionToken;
        })
        .catch((error) => {
          sessionPromiseRef.current = null;
          throw error;
        });
    }
    return sessionPromiseRef.current;
  }, [sessionToken, setSessionToken]);

  const persist = useCallback(
    async (step: number, data: PesquisaRespostasE2) => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setSaving(true);
      try {
        const token = await ensureSession();
        await saveSession<PesquisaRespostasE2>(token, { currentStep: step, respostas: data });
        setLastSaved(new Date());
        setSubmitError(null);
      } catch (error) {
        console.error("Erro ao salvar:", error);
        setSubmitError(error instanceof Error ? error.message : "Não foi possível salvar suas respostas");
      } finally {
        setSaving(false);
      }
    },
    [ensureSession, setSaving, setLastSaved]
  );

  const scheduleSave = useCallback(
    (step: number, data: PesquisaRespostasE2) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        persist(step, data);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist]
  );

  function handleChange(partial: PesquisaRespostasE2) {
    const next = { ...useSurveyE2Store.getState().respostas, ...partial };
    updateRespostas(partial);
    setErrors({});
    setSubmitError(null);
    scheduleSave(currentStep, next);
  }

  async function handleNext() {
    if (!config || isSubmitting) return;

    const stepErrors = validateStepE2(currentStep, respostas, config);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      scrollToFirstError();
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    // Um autosave pendente cairia depois da conclusão e seria rejeitado
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      const token = await ensureSession();

      if (isLastStep) {
        const finalRespostas = pruneInvisibleAnswersE2(respostas, config);
        setSaving(true);
        await completeSession<PesquisaRespostasE2>(token, finalRespostas);
        setSaving(false);
        setSession(token, STEP_E2.CONCLUSAO, finalRespostas, "completed");
        scrollToTop();
        return;
      }

      const nextStep = visibleSteps[stepIndex + 1];
      setStep(nextStep);
      await persist(nextStep, respostas);
      scrollToTop();
    } catch (error) {
      setSaving(false);
      setSubmitError(error instanceof Error ? error.message : "Erro ao avançar");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (stepIndex <= 0) return;
    setStep(visibleSteps[stepIndex - 1]);
    setErrors({});
    scrollToTop();
  }

  function renderStep(loadedConfig: PesquisaConfigE2) {
    const props = { config: loadedConfig, respostas, onChange: handleChange, errors };
    switch (currentStep) {
      case STEP_E2.PERFIL:
        return <StepPerfilE2 {...props} />;
      case STEP_E2.EXPERIENCIA:
        return <StepExperienciaE2 {...props} />;
      case STEP_E2.COMPRA:
        return <StepCompraE2 {...props} />;
      case STEP_E2.SAUDE:
        return <StepSaudeE2 {...props} />;
      case STEP_E2.PEPTIDEOS:
        return <StepPeptideosE2 {...props} />;
      case STEP_E2.MARKETING:
        return <StepMarketingE2 {...props} />;
      case STEP_E2.CONCLUSAO:
        return <StepConclusaoE2 />;
      default:
        return null;
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-emerald-50">
        <div role="status" className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-emerald-500" />
          <p className="text-sm text-slate-500">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  if (initError || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-emerald-50 p-4">
        <div className="mx-auto w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-red-600">{initError ?? "Não foi possível carregar a pesquisa."}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary min-h-[3rem] w-full">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const percent = getProgressPercentE2(currentStep, respostas.situacaoUso, isCompleted);
  const stepName = isCompleted ? "Concluído" : getStepLabelE2(currentStep, config);
  const saveIndicator = isSaving
    ? "Salvando..."
    : lastSaved
      ? `✓ Salvo às ${lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 via-white to-emerald-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto w-full max-w-lg px-4 pb-3 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">DataTirze 2026</p>
            <p aria-live="polite" className="text-xs text-slate-400">
              {saveIndicator}
            </p>
          </div>
          <ProgressBarE2
            percent={percent}
            stepName={stepName}
            message={getProgressMessageE2(percent, config, isCompleted ? undefined : currentStep)}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-6 pt-5">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">{renderStep(config)}</div>

        {submitError && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {!isCompleted && (
          <p className="mt-4 px-2 text-center text-xs leading-relaxed text-slate-400">
            Pesquisa anônima. Não pedimos nome, e-mail, telefone ou CPF. Seus dados são tratados de forma
            agregada.
          </p>
        )}
      </main>

      {!isCompleted && (
        <nav
          aria-label="Navegação da pesquisa"
          className="sticky bottom-0 z-20 border-t border-slate-200/70 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
        >
          <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex <= 0 || isSubmitting}
              className="btn-secondary min-h-[3.25rem] flex-1 rounded-2xl text-base disabled:opacity-30"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="btn-primary min-h-[3.25rem] flex-[2] rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 text-base"
            >
              {isSubmitting ? "Enviando..." : isLastStep ? "Concluir" : "Continuar"}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
