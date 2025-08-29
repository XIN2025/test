import { useCallback, useState } from 'react';
import { ValidationResult } from '../utils/validation';

export interface FormField<T> {
  value: T;
  error?: string;
  touched: boolean;
}

export type FormState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

export interface FormConfig<T> {
  initialValues: T;
  validators?: Partial<Record<keyof T, (value: T[keyof T]) => ValidationResult>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export const useForm = <T extends Record<string, any>>({ initialValues, validators = {}, onSubmit }: FormConfig<T>) => {
  // Initialize form state
  const createInitialFormState = (): FormState<T> => {
    const state = {} as FormState<T>;
    for (const key in initialValues) {
      const formKey = key as keyof T;
      state[formKey] = {
        value: initialValues[formKey],
        error: undefined,
        touched: false,
      };
    }
    return state;
  };

  const [formState, setFormState] = useState<FormState<T>>(createInitialFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update field value
  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        error: undefined, // Clear error when user types
      },
    }));
  }, []);

  // Set field error
  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
      },
    }));
  }, []);

  // Mark field as touched
  const setFieldTouched = useCallback((field: keyof T, touched: boolean = true) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched,
      },
    }));
  }, []);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): boolean => {
      const validator = validators[field];
      if (!validator) return true;

      const fieldState = formState[field];
      const result = validator(fieldState.value);

      if (!result.isValid) {
        setFieldError(field, result.error!);
        return false;
      } else {
        setFieldError(field, undefined);
        return true;
      }
    },
    [formState, validators, setFieldError]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    let isValid = true;

    for (const field in validators) {
      if (!validateField(field as keyof T)) {
        isValid = false;
      }
    }

    return isValid;
  }, [validators, validateField]);

  // Handle field change
  const handleFieldChange = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setFieldValue(field, value);
      setFieldTouched(field);
    },
    [setFieldValue, setFieldTouched]
  );

  // Handle field blur
  const handleFieldBlur = useCallback(
    (field: keyof T) => {
      setFieldTouched(field);
      validateField(field);
    },
    [setFieldTouched, validateField]
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const values = Object.keys(formState).reduce((acc, key) => {
        const formKey = key as keyof T;
        acc[formKey] = formState[formKey].value;
        return acc;
      }, {} as T);

      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, validateForm, onSubmit]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormState(createInitialFormState());
    setIsSubmitting(false);
  }, []);

  // Get current form values
  const getValues = useCallback((): T => {
    return Object.keys(formState).reduce((acc, key) => {
      const formKey = key as keyof T;
      acc[formKey] = formState[formKey].value;
      return acc;
    }, {} as T);
  }, [formState]);

  // Check if form is valid
  const isFormValid = useCallback((): boolean => {
    return Object.keys(validators).every((field) => {
      const formKey = field as keyof T;
      const validator = validators[formKey];
      if (!validator) return true;

      const fieldState = formState[formKey];
      const result = validator(fieldState.value);
      return result.isValid;
    });
  }, [formState, validators]);

  return {
    formState,
    isSubmitting,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    getValues,
    isFormValid,
    validateField,
    validateForm,
  };
};
