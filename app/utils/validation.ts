// Shared validation utilities
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
};

export const validateName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: "Name is required" };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: "Name must be at least 2 characters long" };
  }

  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return {
      isValid: false,
      error: "Name can only contain letters and spaces",
    };
  }

  return { isValid: true };
};

export const validateAge = (age: string): ValidationResult => {
  if (!age.trim()) {
    return { isValid: false, error: "Age is required" };
  }

  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    return {
      isValid: false,
      error: "Please enter a valid age between 1 and 120",
    };
  }

  return { isValid: true };
};

export const validateGender = (gender: string): ValidationResult => {
  if (!gender.trim()) {
    return { isValid: false, error: "Gender is required" };
  }

  const validGenders = ["male", "female", "other", "prefer not to say"];
  if (!validGenders.includes(gender.toLowerCase())) {
    return { isValid: false, error: "Please select a valid gender option" };
  }

  return { isValid: true };
};

export const validateOTP = (otp: string): ValidationResult => {
  if (!otp.trim()) {
    return { isValid: false, error: "OTP is required" };
  }

  if (!/^\d{6}$/.test(otp.trim())) {
    return { isValid: false, error: "OTP must be 6 digits" };
  }

  return { isValid: true };
};

// Generic form validation helper
export const validateForm = <T extends Record<string, any>>(
  formData: T,
  validators: Record<keyof T, (value: any) => ValidationResult>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } => {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const [field, validator] of Object.entries(validators)) {
    const result = validator(formData[field as keyof T]);
    if (!result.isValid) {
      errors[field as keyof T] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
