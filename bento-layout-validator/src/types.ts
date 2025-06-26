// Interface for the validation configuration
export interface ValidationConfig {
  layoutType: string;
  targetContentType: string;
  validateField: string[]; // Changed to array as per README example
  positions: {
    [key: string]: {
      index: number;
      allowedTypes: string[];
    };
  };
  limits: {
    totalEntries: number;
    typeLimits?: { // Made optional as it might not always be present
      [key: string]: number;
    };
  };
}

// Interface for a single validation error
export interface ValidationError {
  message: string;
  // We can add more properties here later if needed, e.g., fieldId, severity
}

// Interface for the overall validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
