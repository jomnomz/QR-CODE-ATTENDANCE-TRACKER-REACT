import { validateAndFormatPhone } from "./PhoneValidation.js"; 

export const validateTeacherData = (teacherData) => {
  const errors = {};
  
  // Required fields
  if (!teacherData.employee_id?.trim()) {
    errors.employee_id = 'Employee ID is required';
  }
  
  if (!teacherData.first_name?.trim()) {
    errors.first_name = 'First name is required';
  }
  
  if (!teacherData.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  }
  
  // Optional fields - validate if provided
  if (teacherData.email_address && !/\S+@\S+\.\S+/.test(teacherData.email_address)) {
    errors.email_address = 'Email address is invalid';
  }
  
  // Phone validation using shared utility
  if (teacherData.phone_no) {
    const validationResult = validateAndFormatPhone(teacherData.phone_no);
    if (!validationResult.isValid) {
      errors.phone_no = validationResult.error;
    }
  }
  
  return errors;
};