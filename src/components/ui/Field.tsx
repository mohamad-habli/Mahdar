'use client'

import { cn } from '@/lib/utils'

interface BaseProps {
  label: string
  required?: boolean
  hint?: string
  className?: string
}

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: BaseProps & { children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
        {label}
        {required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

type InputProps = BaseProps & React.InputHTMLAttributes<HTMLInputElement>
export function TextField({ label, required, hint, className, ...rest }: InputProps) {
  return (
    <Field label={label} required={required} hint={hint} className={className}>
      <input className="input" {...rest} />
    </Field>
  )
}

type TextAreaProps = BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
export function TextAreaField({ label, required, hint, className, ...rest }: TextAreaProps) {
  return (
    <Field label={label} required={required} hint={hint} className={className}>
      <textarea className={cn('input', 'min-h-20 resize-y')} {...rest} />
    </Field>
  )
}

interface Option {
  value: string
  label: string
}
type SelectProps = BaseProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: Option[]
    placeholder?: string
  }
export function SelectField({
  label,
  required,
  hint,
  className,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  return (
    <Field label={label} required={required} hint={hint} className={className}>
      <select className="input" {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
