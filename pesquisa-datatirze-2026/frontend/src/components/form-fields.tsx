import { cn } from "@/lib/utils";

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  description?: string;
}

export function OptionButton({ label, selected, onClick, description }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("option-btn", selected && "option-btn-selected")}
    >
      <span>{label}</span>
      {description && <span className="mt-1 block text-xs text-slate-500">{description}</span>}
    </button>
  );
}

interface OptionGroupProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function OptionGroup({ label, error, children }: OptionGroupProps) {
  return (
    <div className="mb-5">
      <p className="field-label">{label}</p>
      <div className="grid gap-2">{children}</div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

interface CheckboxOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxOption({ label, checked, onChange }: CheckboxOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span>{label}</span>
    </label>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}

export function TextInput({ label, value, onChange, error, placeholder, type = "text" }: TextInputProps) {
  return (
    <div className="mb-5">
      <label className="field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
  placeholder?: string;
}

export function SelectInput({ label, value, onChange, options, error, placeholder }: SelectInputProps) {
  return (
    <div className="mb-5">
      <label className="field-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">{placeholder || "Selecione"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function SliderInput({ label, value, onChange, min = 0, max = 10 }: SliderInputProps) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <label className="field-label mb-0">{label}</label>
        <span className="rounded-lg bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-brand-600"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
