export const validateStudentData = (studentData) => {
  const errors = {};
  
  if (!studentData.lrn?.trim()) {
    errors.lrn = 'LRN is required';
  }
  
  if (!studentData.first_name?.trim()) {
    errors.first_name = 'First name is required';
  }
  
  if (!studentData.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  }
  
  if (!studentData.grade?.trim()) {
    errors.grade = 'Grade is required';
  }
  
  if (!studentData.section?.trim()) {
    errors.section = 'Section is required';
  }
  
  if (studentData.email && !/\S+@\S+\.\S+/.test(studentData.email)) {
    errors.email = 'Email is invalid';
  }
  
  return errors;
};