import * as React from "react";
import { TextField, MenuItem } from "@mui/material";

interface PlainInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<any>) => void;
  onBlur?: (e: React.FocusEvent<any>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export const PlainInput = ({ label, name, value, onChange, onBlur, placeholder, required, error }: PlainInputProps) => (
  <TextField
    fullWidth
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    required={required}
    error={Boolean(error)}
    helperText={error}
  />
);

interface PlainTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<any>) => void;
  onBlur?: (e: React.FocusEvent<any>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const PlainTextarea = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 5,
  required,
  error,
  helperText,
}: PlainTextareaProps) => (
  <TextField
    fullWidth
    multiline
    rows={rows}
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    required={required}
    error={Boolean(error)}
    helperText={error || helperText}
  />
);

interface PlainSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<any>) => void;
  onBlur?: (e: React.FocusEvent<any>) => void;
  options: { value: string; label: string }[];
}

export const PlainSelect = ({ label, name, value, onChange, onBlur, options }: PlainSelectProps) => (
  <TextField
    select
    fullWidth
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
  >
    {options.map((o) => (
      <MenuItem key={o.value} value={o.value}>
        {o.label}
      </MenuItem>
    ))}
  </TextField>
);