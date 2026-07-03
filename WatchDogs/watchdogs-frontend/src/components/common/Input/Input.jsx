import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  error,
  helperText,
  leftIcon,
  rightIcon,
  disabled = false,
  required = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className={`input-container ${error ? 'input-container--error' : ''}`}>
        {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`input ${leftIcon ? 'input--with-left-icon' : ''} ${rightIcon ? 'input--with-right-icon' : ''}`}
          {...props}
        />
        
        {rightIcon && <span className="input-icon input-icon--right">{rightIcon}</span>}
      </div>
      
      {error && <span className="input-error">{error}</span>}
      {helperText && !error && <span className="input-helper">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;