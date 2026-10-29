import { useState } from "react";
import { cn } from "@/lib/utils";
import { toggleMultiValue } from "@/lib/survey-e2";
import type { OpcaoE2 } from "@/types/pesquisa-e2";

interface QuestionBlockProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function QuestionBlock({ label, hint, error, children }: QuestionBlockProps) {
  return (
    <fieldset className="mb-7 min-w-0">
      <legend className="mb-1 text-[15px] font-semibold leading-snug text-brand-900">{label}</legend>
      {hint && <p className="mb-3 text-xs text-slate-500">{hint}</p>}
      <div className={cn("grid gap-2.5", !hint && "mt-3")}>{children}</div>
      {error && (
        <p role="alert" className="field-error mt-2 text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface ChoiceCardProps {
  label: string;
  description?: string;
  selected: boolean;
  isMulti?: boolean;
  onClick: () => void;
}

function ChoiceCard({ label, description, selected, isMulti = false, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      role={isMulti ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left text-[15px] leading-snug transition active:scale-[0.99]",
        selected
          ? "border-brand-600 bg-brand-50 font-semibold text-brand-900 shadow-sm"
          : "border-slate-200 text-slate-700 hover:border-brand-500/60"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center border-2 text-xs font-bold",
          isMulti ? "rounded-md" : "rounded-full",
          selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-transparent"
        )}
      >
        ✓
      </span>
      <span className="min-w-0">
        {label}
        {description && <span className="mt-0.5 block text-xs font-normal text-slate-500">{description}</span>}
      </span>
    </button>
  );
}

interface SingleChoiceE2Props {
  label: string;
  hint?: string;
  options: readonly OpcaoE2[];
  value?: string;
  onChange: (id: string) => void;
  error?: string;
}

export function SingleChoiceE2({ label, hint, options, value, onChange, error }: SingleChoiceE2Props) {
  return (
    <QuestionBlock label={label} hint={hint} error={error}>
      {options.map((option) => (
        <ChoiceCard
          key={option.id}
          label={option.label}
          description={option.descricao}
          selected={value === option.id}
          onClick={() => onChange(option.id)}
        />
      ))}
    </QuestionBlock>
  );
}

interface MultiChoiceE2Props {
  label: string;
  hint?: string;
  options: readonly OpcaoE2[];
  values?: string[];
  onChange: (ids: string[]) => void;
  maxSelections?: number;
  error?: string;
}

export function MultiChoiceE2({
  label,
  hint,
  options,
  values,
  onChange,
  maxSelections,
  error,
}: MultiChoiceE2Props) {
  const [limitReached, setLimitReached] = useState(false);
  const selectedCount = values?.length ?? 0;
  const baseHint = hint ?? (maxSelections ? `Escolha até ${maxSelections} opções` : "Pode marcar mais de uma opção");
  const fullHint = maxSelections ? `${baseHint} · ${selectedCount}/${maxSelections}` : baseHint;

  function handleToggle(option: OpcaoE2) {
    const result = toggleMultiValue(values, option, options, maxSelections);
    setLimitReached(result.hitLimit);
    onChange(result.values);
  }

  return (
    <QuestionBlock
      label={label}
      hint={limitReached ? `${fullHint} — limite atingido, desmarque uma opção para trocar` : fullHint}
      error={error}
    >
      {options.map((option) => (
        <ChoiceCard
          key={option.id}
          isMulti
          label={option.label}
          description={option.descricao}
          selected={Boolean(values?.includes(option.id))}
          onClick={() => handleToggle(option)}
        />
      ))}
    </QuestionBlock>
  );
}
