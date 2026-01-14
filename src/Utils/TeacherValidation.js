// TeacherDataValidation.js
import { validateAndFormatPhone } from "./PhoneValidation.js"; 

export const validateTeacherData = (teacherData) => {
  const errors = {};
  
  console.log(`🔍 Validating teacher data:`, {
    employee_id: teacherData.employee_id,
    first_name: teacherData.first_name,
    last_name: teacherData.last_name,
    grade_sections_teaching: teacherData.grade_sections_teaching,
    adviser_grade_section: teacherData.adviser_grade_section
  });
  
  // Required fields
  if (!teacherData.employee_id?.trim()) {
    errors.employee_id = 'Employee ID is required';
  } else if (teacherData.employee_id.trim().length > 50) {
    errors.employee_id = 'Employee ID must be 50 characters or less';
  }
  
  if (!teacherData.first_name?.trim()) {
    errors.first_name = 'First name is required';
  } else if (teacherData.first_name.trim().length > 100) {
    errors.first_name = 'First name must be 100 characters or less';
  }
  
  if (!teacherData.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  } else if (teacherData.last_name.trim().length > 100) {
    errors.last_name = 'Last name must be 100 characters or less';
  }
  
  // Middle name length check if provided
  if (teacherData.middle_name && teacherData.middle_name.trim().length > 100) {
    errors.middle_name = 'Middle name must be 100 characters or less';
  }
  
  // Email validation - optional but validate format if provided
  if (teacherData.email_address && teacherData.email_address.trim()) {
    const email = teacherData.email_address.trim();
    if (email.length > 255) {
      errors.email_address = 'Email must be 255 characters or less';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email_address = 'Email address is invalid';
    }
  }
  
  // Phone validation using shared utility - optional
  if (teacherData.phone_no && teacherData.phone_no.trim()) {
    const validationResult = validateAndFormatPhone(teacherData.phone_no);
    if (!validationResult.isValid) {
      errors.phone_no = validationResult.error;
    }
  }
  
  // MORE FLEXIBLE: Validate grade-section format if provided
  // Accepts formats like: "7-1", "7 Andres", "7-Andres Bonifacio", "7 - Section Name"
  if (teacherData.grade_sections_teaching && teacherData.grade_sections_teaching.trim()) {
    const gradeSections = teacherData.grade_sections_teaching.split(',').map(s => s.trim()).filter(s => s);
    const invalidGradeSections = [];
    
    gradeSections.forEach(gs => {
      // Accept: "7-1", "7 1", "7-Andres", "7 - Andres Bonifacio", "7 Andres"
      if (!gs.match(/^(\d+)\s*[-]?\s*(.+)$/)) {
        invalidGradeSections.push(gs);
      }
    });
    
    if (invalidGradeSections.length > 0) {
      errors.grade_sections_teaching = `Invalid grade-section format: ${invalidGradeSections.join(', ')}. Use formats like "7-1" or "7 - Section Name"`;
    }
  }
  
  // MORE FLEXIBLE: Validate adviser grade-section if provided
  if (teacherData.adviser_grade_section && teacherData.adviser_grade_section.trim()) {
    if (!teacherData.adviser_grade_section.match(/^(\d+)\s*[-]?\s*(.+)$/)) {
      errors.adviser_grade_section = 'Invalid adviser grade-section format. Use formats like "7-1" or "7 - Section Name"';
    }
  }
  
  // Status validation if provided
  if (teacherData.status && teacherData.status.trim()) {
    const validStatuses = ['pending', 'active', 'inactive'];
    const statusLower = teacherData.status.toLowerCase().trim();
    if (!validStatuses.includes(statusLower)) {
      errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
    }
  }
  
  if (Object.keys(errors).length > 0) {
    console.log(`❌ Validation errors:`, errors);
  } else {
    console.log(`✅ Validation passed`);
  }
  
  return errors;
};