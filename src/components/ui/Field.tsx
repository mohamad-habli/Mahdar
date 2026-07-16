'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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

export function PasswordField({ label, required, hint, className, ...rest }: InputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label} required={required} hint={hint} className={className}>
      <div className="relative">
        <input className="input pl-11" type={visible ? 'text' : 'password'} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--text-3)' }}
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          title={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
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
