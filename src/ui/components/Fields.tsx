import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const control =
  'min-h-12 w-full rounded-lg border border-muted bg-paper px-3 text-base text-ink placeholder:text-muted/70 aria-[invalid=true]:border-[#b3261e]'

export function TextField({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="font-bold">{label}</span>
      {hint && <span className="block text-sm text-muted">{hint}</span>}
      <input {...props} aria-invalid={error ? true : undefined} className={`${control} mt-1`} />
      {error && (
        <span role="alert" className="mt-1 block text-sm font-bold text-[#b3261e] dark:text-[#ffb4ab]">
          {error}
        </span>
      )}
    </label>
  )
}

export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-bold">{label}</span>
      <select {...props} className={`${control} mt-1`}>
        {children}
      </select>
    </label>
  )
}

/** Segmented choice (radio buttons) with large touch targets. */
export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="font-bold">{legend}</legend>
      <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-sm font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
              value === option.value ? 'bg-accent text-on-accent' : 'text-muted'
            }`}
          >
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
