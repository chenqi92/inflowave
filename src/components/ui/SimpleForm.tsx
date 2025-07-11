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

// Simple Form component without complex useEffect
export interface SimpleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  initialValues?: Record<string, any>;
  onFinish?: (values: Record<string, any>) => void;
  onFinishFailed?: (errorInfo: any) => void;
  layout?: 'horizontal' | 'vertical' | 'inline';
  preserve?: boolean;
}

const SimpleForm: React.FC<SimpleFormProps> = ({
  children,
  initialValues = {},
  onFinish,
  onFinishFailed,
  layout = 'vertical',
  className,
  onSubmit,
  preserve = true,
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

// Simple Form Item component
export interface SimpleFormItemProps extends React.HTMLAttributes<HTMLDivElement> {
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
  valuePropName?: string;
}

const SimpleFormItem: React.FC<SimpleFormItemProps> = ({
  children,
  label,
  name,
  required,
  rules = [],
  help,
  validateStatus,
  valuePropName = 'value',
  className,
  ...props
}) => {
  const formContext = useContext(FormContext);
  
  const error = name && formContext?.errors[name];
  const touched = name && formContext?.touched[name];
  const showError = error && touched;

  // Clone children to add form control props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && name && formContext) {
      const childProps: any = {
        onBlur: () => {
          formContext.setFieldTouched(name, true);
        },
        variant: showError ? 'error' : undefined,
      };

      // Set the value using the appropriate prop name
      if (valuePropName === 'checked') {
        childProps.checked = formContext.values[name] || false;
        childProps.onChange = (checked: boolean) => {
          formContext.setFieldValue(name, checked);
        };
      } else {
        childProps[valuePropName] = formContext.values[name] || '';
        childProps.onChange = (e: any) => {
          const value = e?.target?.value !== undefined ? e.target.value : e;
          formContext.setFieldValue(name, value);
        };
      }

      return React.cloneElement(child as any, childProps);
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
export const useSimpleForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useSimpleForm must be used within a SimpleForm component');
  }
  return context;
};

// Simple form instance interface
export interface SimpleFormInstance {
  setFieldsValue: (values: Record<string, any>) => void;
  getFieldsValue: () => Record<string, any>;
  resetFields: () => void;
  submit: () => void;
  validateFields: () => Promise<Record<string, any>>;
}

// Hook to create simple form instance
export const useSimpleFormInstance = (): [SimpleFormInstance] => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formInstance: SimpleFormInstance = {
    setFieldsValue: (newValues: Record<string, any>) => {
      setValues(prev => ({ ...prev, ...newValues }));
    },
    getFieldsValue: () => values,
    resetFields: () => {
      setValues({});
      setErrors({});
    },
    submit: () => {
      // Basic submit implementation
    },
    validateFields: async () => {
      const hasErrors = Object.values(errors).some(error => error);
      if (hasErrors) {
        throw errors;
      }
      return values;
    },
  };

  return [formInstance];
};

// Attach methods to SimpleForm
SimpleForm.useForm = useSimpleFormInstance;
SimpleForm.Item = SimpleFormItem;

export { SimpleForm, SimpleFormItem };