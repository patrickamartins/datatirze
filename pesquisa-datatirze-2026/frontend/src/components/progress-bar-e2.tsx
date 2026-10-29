interface ProgressBarE2Props {
  percent: number;
  stepName: string;
  message: string;
}

export function ProgressBarE2({ percent, stepName, message }: ProgressBarE2Props) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold text-brand-900">{stepName}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Progresso da pesquisa: ${percent}%`}
        className="h-2.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 via-sky-500 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{message}</p>
    </div>
  );
}
