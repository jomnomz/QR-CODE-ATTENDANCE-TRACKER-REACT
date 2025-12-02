// Helper functions for comparisons (formerly StudentSortHelpers.js)
export const extractLeadingNumber = (str) => {
  if (!str) return null;
  
  const match = str.match(/^\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export const compareSections = (sectionA, sectionB) => {
  if (sectionA === sectionB) return 0;
  
  const numA = extractLeadingNumber(sectionA);
  const numB = extractLeadingNumber(sectionB);
  
  if (numA !== null && numB !== null) {
    if (numA !== numB) {
      return numA - numB;
    }

    return sectionA.localeCompare(sectionB);
  }
  
  if (numA !== null) return -1;
  if (numB !== null) return 1;
  
  return sectionA.localeCompare(sectionB);
};

export const compareNames = (nameA, nameB) => {
  const cleanA = (nameA || '').toLowerCase().trim();
  const cleanB = (nameB || '').toLowerCase().trim();
  return cleanA.localeCompare(cleanB);
};

export const compareGrades = (gradeA, gradeB) => {
  const numA = parseInt(gradeA) || 0;
  const numB = parseInt(gradeB) || 0;
  return numA - numB;
};

// For backward compatibility
export const sortStudents = (students) => {
  if (!students || !Array.isArray(students)) return [];
  
  return [...students].sort((a, b) => {
    const sectionA = (a.section || '').toString().trim();
    const sectionB = (b.section || '').toString().trim();
    
    const sectionComparison = compareSections(sectionA, sectionB);
    if (sectionComparison !== 0) {
      return sectionComparison;
    }
    
    const lastNameA = (a.last_name || '').toLowerCase().trim();
    const lastNameB = (b.last_name || '').toLowerCase().trim();
    
    return lastNameA.localeCompare(lastNameB);
  });
};