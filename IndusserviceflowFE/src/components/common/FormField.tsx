import type { ReactNode, InputHTMLAttributes } from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  full?: boolean;
  children: ReactNode;
}

export const FormField = ({ label, htmlFor, error, full = true, children }: FormFieldProps) => (
  <div className={`oa-field${full ? " full" : ""}`}>
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {error && <span className="oa-field-error">{error}</span>}
  </div>
);

interface FormInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  onBlur?: () => void;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  full?: boolean;
}

export const FormInput = ({ label, id, value, onChange, type = "text", placeholder, error, onBlur, inputProps, full = true }: FormInputProps) => (
  <FormField label={label} htmlFor={id} error={error} full={full}>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={!!error}
      className={error ? "oa-input-error" : undefined}
      {...inputProps}
    />
  </FormField>
);

interface FormTextareaProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export const FormTextarea = ({ label, id, value, onChange, placeholder, error }: FormTextareaProps) => (
  <FormField label={label} htmlFor={id} error={error}>
    <textarea id={id} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  </FormField>
);

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  error?: string;
  full?: boolean;
}

export const FormSelect = ({ label, id, value, onChange, options, error, full = true }: FormSelectProps) => (
  <FormField label={label} htmlFor={id} error={error} full={full}>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </FormField>
);

export default FormField;