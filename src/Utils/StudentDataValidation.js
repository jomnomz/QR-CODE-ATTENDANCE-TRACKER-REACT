import { validateAndFormatPhone } from "./PhoneValidation.js"; 

export const validateStudentData = (studentData, options = {}) => {
  const errors = {};
  
  // Required fields
  if (!studentData.lrn?.trim()) errors.lrn = 'LRN is required';
  if (!studentData.first_name?.trim()) errors.first_name = 'First name is required';
  if (!studentData.last_name?.trim()) errors.last_name = 'Last name is required';
  if (!studentData.grade?.trim()) errors.grade = 'Grade is required';
  if (!studentData.section?.trim()) errors.section = 'Section is required';
  
  // Email validation (optional but validate if provided)
  if (studentData.email && !/\S+@\S+\.\S+/.test(studentData.email)) {
    errors.email = 'Email is invalid';
  }
  
  // Phone number validation using shared utility
  if (studentData.phone_number) {
    const validationResult = validateAndFormatPhone(studentData.phone_number);
    if (!validationResult.isValid) {
      errors.phone_number = validationResult.error;
    }
    // Note: You might want to update studentData.phone_number with the formatted version
  }
  
  // Guardian fields (optional but validate if provided)
  if (studentData.guardian_first_name && !studentData.guardian_first_name.trim()) {
    errors.guardian_first_name = 'Guardian first name cannot be empty if provided';
  }
  
  if (studentData.guardian_last_name && !studentData.guardian_last_name.trim()) {
    errors.guardian_last_name = 'Guardian last name cannot be empty if provided';
  }
  
  // Guardian phone validation using shared utility
  if (studentData.guardian_phone_number) {
    const validationResult = validateAndFormatPhone(studentData.guardian_phone_number);
    if (!validationResult.isValid) {
      errors.guardian_phone_number = validationResult.error;
    }
  }
  
  if (studentData.guardian_email && !/\S+@\S+\.\S+/.test(studentData.guardian_email)) {
    errors.guardian_email = 'Guardian email is invalid';
  }
  
  return errors;
};