import { useEffect, useState, useCallback } from "react";
import { ProgressBar } from "@/components/progress-bar";
import {
  StepPerfil,
  StepExperiencia,
  StepHistorico,
  StepCompra,
  StepResultados,
  StepSaude,
  StepEfeitos,
  StepConteudo,
  StepConclusao,
} from "@/components/survey-steps";
import { createSession, fetchConfig, fetchSession, saveSession, completeSession, verifyEmail } from "@/lib/api";
import { getStepLabel, getVisibleSteps, SESSION_KEY } from "@/lib/utils";
import { validateStep } from "@/lib/validation";
import { useSurveyStore } from "@/store/survey-store";

export function SurveyPage() {
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
    updateRespostas,
    setStep,
    setSaving,
    setLastSaved,
  } = useSurveyStore();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const visibleSteps = getVisibleSteps(respostas.utilizouTirzepatida);
  const stepIndex = visibleSteps.indexOf(currentStep);
  const isLastStep = stepIndex === visibleSteps.length - 1;
  const isCompleted = status === "completed";

  const init = useCallback(async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);

      const savedToken = localStorage.getItem(SESSION_KEY);
      if (savedToken) {
        try {
          const sessao = await fetchSession(savedToken);
          if (sessao.status !== "completed") {
            setSession(sessao.sessionToken, sessao.currentStep, sessao.respostas, sessao.status);
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }

      const nova = await createSession();
      localStorage.setItem(SESSION_KEY, nova.sessionToken);
      setSession(nova.sessionToken, nova.currentStep, nova.respostas, nova.status);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : "Erro ao iniciar pesquisa");
    } finally {
      setLoading(false);
    }
  }, [setConfig, setSession]);

  useEffect(() => {
    init();
  }, [init]);

  const autoSave = useCallback(
    async (step: number, data: typeof respostas, stepStatus?: string) => {
      if (!sessionToken) return;
      setSaving(true);
      try {
        await saveSession(sessionToken, {
          currentStep: step,
          respostas: data,
          status: stepStatus,
        });
        setLastSaved(new Date());
        setSubmitError(null);
      } catch (err) {
        console.error("Erro ao salvar:", err);
        setSubmitError(err instanceof Error ? err.message : "Erro ao salvar no banco de dados");
      } finally {
        setSaving(false);
      }
    },
    [sessionToken, setSaving, setLastSaved]
  );

  function handleChange(partial: typeof respostas) {
    const next = { ...respostas, ...partial };
    updateRespostas(partial);
    setErrors({});
    setSubmitError(null);
    autoSave(currentStep, next);
  }

  async function handleNext() {
    const stepErrors = validateStep(currentStep, respostas);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setSubmitError(null);

    try {
      if (currentStep === 1 && sessionToken) {
        await verifyEmail(respostas.email || "", sessionToken);
      }

      if (currentStep === 2 && respostas.utilizouTirzepatida === false) {
        await saveSession(sessionToken!, {
          currentStep: 9,
          respostas,
          status: "completed",
        });
        await completeSession(sessionToken!, respostas);
        setSession(sessionToken!, 9, respostas, "completed");
        setStep(9);
        return;
      }

      if (isLastStep && currentStep === 8) {
        await completeSession(sessionToken!, respostas);
        setSession(sessionToken!, 9, respostas, "completed");
        setStep(9);
        return;
      }

      const nextStep = visibleSteps[stepIndex + 1];
      setStep(nextStep);
      await autoSave(nextStep, respostas);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao avançar";
      if (message.toLowerCase().includes("e-mail")) {
        setErrors({ email: message });
      }
      setSubmitError(message);
    }
  }

  function handleBack() {
    if (stepIndex <= 0) return;
    const prevStep = visibleSteps[stepIndex - 1];
    setStep(prevStep);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStep() {
    if (!config) return null;
    const props = { config, respostas, onChange: handleChange, errors };

    if (isCompleted && currentStep !== 9) {
      return <StepConclusao config={config} respostas={respostas} />;
    }

    switch (currentStep) {
      case 1:
        return <StepPerfil {...props} />;
      case 2:
        return <StepExperiencia {...props} />;
      case 3:
        return <StepHistorico {...props} />;
      case 4:
        return <StepCompra {...props} />;
      case 5:
        return <StepResultados respostas={respostas} onChange={handleChange} errors={errors} />;
      case 6:
        return <StepSaude {...props} />;
      case 7:
        return <StepEfeitos {...props} />;
      case 8:
        return <StepConteudo {...props} />;
      case 9:
        return <StepConclusao config={config} respostas={respostas} />;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-500">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="survey-card max-w-md text-center">
          <p className="mb-4 text-red-600">{initError}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const showNav = !isCompleted || currentStep === 9;
  const progressStep = isCompleted ? visibleSteps.length : stepIndex + 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">DataTirze 2026</p>
          <h1 className="text-lg font-bold text-brand-900 sm:text-xl">
            Pesquisa Nacional sobre o Uso de Tirzepatida no Brasil
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {currentStep !== 9 && !isCompleted && (
          <ProgressBar
            current={progressStep}
            total={visibleSteps.length}
            label={`${getStepLabel(currentStep)} — etapa ${progressStep} de ${visibleSteps.length}`}
          />
        )}

        <div className="survey-card">{renderStep()}</div>

        {submitError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {showNav && currentStep !== 9 && !isCompleted && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex <= 0}
              className="btn-secondary disabled:opacity-30"
            >
              Voltar
            </button>

            <div className="text-center text-xs text-slate-400">
              {isSaving ? "Salvando..." : lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString("pt-BR")}` : ""}
            </div>

            <button type="button" onClick={handleNext} className="btn-primary">
              {currentStep === 2 && respostas.utilizouTirzepatida === false
                ? "Finalizar"
                : currentStep === 8
                  ? "Concluir"
                  : "Continuar"}
            </button>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        Uma resposta por e-mail · DataTirze · 2026
      </footer>
    </div>
  );
}
