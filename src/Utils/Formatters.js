export const formatStudentName = (student) => {
  return `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim();
};

export const formatStudentDisplayName = (student) => {
  return `${student.first_name} ${student.last_name}`.trim();
};

export const formatTeacherName = (teacher) => {
  return `${teacher.first_name} ${teacher.middle_name ? teacher.middle_name + ' ' : ''}${teacher.last_name}`.trim();
};

export const formatTeacherDisplayName = (teacher, includeTitle = false) => {
  const name = `${teacher.first_name} ${teacher.last_name}`.trim();
  return includeTitle ? `Teacher ${name}` : name;
};

export const formatGradeSection = (studentOrAttendance) => {
  // Handle both student objects and attendance objects
  if (studentOrAttendance.grade_section) {
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

export const formatTime = (timeString) => {
  if (!timeString) return "—";
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

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'N/A';
  }
};

// Add new teacher-specific formatter
export const formatTeacherDetails = (teacher) => {
  return {
    employeeId: teacher.employee_id || 'NA',
    fullName: formatTeacherName(teacher),
    email: teacher.email_address || 'NA',
    phone: teacher.phone_no || 'NA'
  };
};