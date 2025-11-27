export const formatStudentName = (student) => {
  return `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim();
};

export const formatGradeSection = (student) => {
  return `${student.grade}-${student.section}`;
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

export const formatNA = (value) => {
  return value || "NA";
};