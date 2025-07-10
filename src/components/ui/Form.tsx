import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';

// Form context
interface FormContextValue {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setFieldValue: (name: string, value: any) => void;
  setFieldError: (name: string, error: string) => void;
  setFieldTouched: (name: string, touched: boolean) => void;
}

const FormContext = createContext<FormContextValue | null>(null);

// Form component
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  initialValues?: Record<string, any>;
  onFinish?: (values: Record<string, any>) => void;
  onFinishFailed?: (errorInfo: any) => void;
  layout?: 'horizontal' | 'vertical' | 'inline';
}

const Form: React.FC<FormProps> = ({
  children,
  initialValues = {},
  onFinish,
  onFinishFailed,
  layout = 'vertical',
  className,
  onSubmit,
  ...props
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name: string, touched: boolean) => {
    setTouched(prev => ({ ...prev, [name]: touched }));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Basic validation
    const hasErrors = Object.values(errors).some(error => error);
    
    if (hasErrors) {
      onFinishFailed?.({ values, errors });
    } else {
      onFinish?.(values);
    }
    
    onSubmit?.(e);
  };

  const contextValue: FormContextValue = {
    values,
    errors,
    touched,
    setFieldValue,
    setFieldError,
    setFieldTouched,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        className={cn(
          'space-y-4',
          layout === 'horizontal' && 'space-y-6',
          layout === 'inline' && 'flex flex-wrap gap-4 space-y-0',
          className
        )}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
};

// Form Item component
export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  name?: string;
  required?: boolean;
  rules?: Array<{
    required?: boolean;
    message?: string;
    pattern?: RegExp;
    validator?: (value: any) => string | undefined;
  }>;
  help?: string;
  validateStatus?: 'success' | 'warning' | 'error' | 'validating';
}

const FormItem: React.FC<FormItemProps> = ({
  children,
  label,
  name,
  required,
  rules = [],
  help,
  validateStatus,
  className,
  ...props
}) => {
  const formContext = useContext(FormContext);
  
  const error = name && formContext?.errors[name];
  const touched = name && formContext?.touched[name];
  const showError = error && touched;

  // Validate field
  const validateField = useCallback((value: any) => {
    if (!name || !formContext) return;

    for (const rule of rules) {
      if (rule.required && (!value || value === '')) {
        formContext.setFieldError(name, rule.message || `${label || name} is required`);
        return;
      }
      
      if (rule.pattern && value && !rule.pattern.test(value)) {
        formContext.setFieldError(name, rule.message || `${label || name} format is invalid`);
        return;
      }
      
      if (rule.validator) {
        const validationError = rule.validator(value);
        if (validationError) {
          formContext.setFieldError(name, validationError);
          return;
        }
      }
    }
    
    formContext.setFieldError(name, '');
  }, [name, rules, label, formContext]);

  // Clone children to add form control props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && name && formContext) {
      return React.cloneElement(child as any, {
        value: formContext.values[name] || '',
        onChange: (e: any) => {
          const value = e.target ? e.target.value : e;
          formContext.setFieldValue(name, value);
          validateField(value);
        },
        onBlur: () => {
          formContext.setFieldTouched(name, true);
          validateField(formContext.values[name]);
        },
        variant: showError ? 'error' : undefined,
      });
    }
    return child;
  });

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div>
        {enhancedChildren}
      </div>
      
      {(showError || help) && (
        <div className={cn(
          'text-sm',
          showError ? 'text-red-600' : 'text-gray-500'
        )}>
          {showError ? error : help}
        </div>
      )}
    </div>
  );
};

// Hook to use form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a Form component');
  }
  return context;
};

Form.Item = FormItem;

export { Form, FormItem };
