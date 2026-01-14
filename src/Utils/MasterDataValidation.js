// MasterDataValidation.js
export const validateGradeSectionData = (data) => {
  const errors = {};
  
  if (!data.grade?.trim()) errors.grade = 'Grade is required';
  if (!data.section?.trim()) errors.section = 'Section is required';
  if (!data.room?.trim()) errors.room = 'Room is required';
  
  if (data.grade && !/^\d+$/.test(data.grade.trim())) {
    errors.grade = 'Grade must be a number';
  }
  
  return errors;
};

export const validateSubjectData = (data) => {
  const errors = {};
  
  if (!data.subject_code?.trim()) errors.subject_code = 'Subject code is required';
  if (!data.subject_name?.trim()) errors.subject_name = 'Subject name is required';
  
  if (data.subject_code && !/^[A-Z0-9]+$/.test(data.subject_code.trim())) {
    errors.subject_code = 'Subject code must be uppercase letters and numbers only';
  }
  
  return errors;
};