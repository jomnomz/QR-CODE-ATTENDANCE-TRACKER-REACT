export const formatStudentName = (student) => {
  return `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim();
};

export const formatGradeSection = (studentOrAttendance) => {
  // Handle both student objects and attendance objects
  if (studentOrAttendance.grade_section) {
    // If grade_section already exists (for backward compatibility)
    return studentOrAttendance.grade_section;
  }
  
  // If separate grade and section fields
  const grade = studentOrAttendance.grade || '';
  const section = studentOrAttendance.section || '';
  
  if (grade && section) {
    return `${grade} - ${section}`;
  } else if (grade) {
    return grade;
  } else if (section) {
    return section;
  }
  
  return "NA";
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

export const formatNA = (value) => {
  return value || "NA";
};

// Add these to your existing Formatters
export const formatTime = (timeString) => {
  if (!timeString) return "—"; // Use em dash for empty times
  try {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return timeString;
  }
};

export const formatAttendanceStatus = (status) => {
  const statusMap = {
    present: 'Present',
    absent: 'Absent'
  };
  return statusMap[status] || 'Absent';
};

