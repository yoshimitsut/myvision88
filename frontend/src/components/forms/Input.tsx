import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
// import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  error, 
  className = '', 
  id,
  ...props 
}, ref) => {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`form-input ${error ? 'error' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span 
          id={`${inputId}-error`}
          className="error-message"
          role="alert"
        >
          {error}
        </span>
      )}

      
    </div>
  );
});

Input.displayName = 'Input';

export default Input;