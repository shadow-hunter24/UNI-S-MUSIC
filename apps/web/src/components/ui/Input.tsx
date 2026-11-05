import { InputHTMLAttributes, forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-describedby={clsx(error && errorId, helperText && helperId) || undefined}
          aria-invalid={!!error}
          className={clsx(
            'h-10 w-full rounded-brand border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            error ? 'border-error' : 'border-bg-elevated hover:border-primary/50',
            className,
          )}
          {...props}
        />
        {error && <p id={errorId} role="alert" className="text-xs text-error">{error}</p>}
        {helperText && !error && <p id={helperId} className="text-xs text-text-secondary">{helperText}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
