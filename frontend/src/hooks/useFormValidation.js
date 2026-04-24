import { useState, useCallback } from 'react';

const useFormValidation = (rules) => {
  const [errors, setErrors] = useState({});

  const validateField = useCallback((name, value) => {
    const fieldRules = rules[name];
    if (!fieldRules) return '';

    for (const rule of fieldRules) {
      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        return rule.message || `${name} is required`;
      }
      if (rule.minLength && value && value.length < rule.minLength) {
        return rule.message || `Must be at least ${rule.minLength} characters`;
      }
      if (rule.pattern && value && !rule.pattern.test(value)) {
        return rule.message || `Invalid format`;
      }
      if (rule.validate && value) {
        const result = rule.validate(value);
        if (result) return result;
      }
    }
    return '';
  }, [rules]);

  const validateAll = useCallback((data) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(field => {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const handleFieldChange = useCallback((name, value) => {
    const error = validateField(name, value);
    setErrors(prev => {
      if (error) return { ...prev, [name]: error };
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, [validateField]);

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, validateAll, handleFieldChange, clearErrors };
};

export default useFormValidation;
