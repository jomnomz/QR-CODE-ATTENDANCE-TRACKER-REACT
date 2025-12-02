import { compareSections } from './CompareHelpers';

export const sortEntities = (entities, sortConfig = {}) => {
  if (!entities || !Array.isArray(entities)) return [];
  
  const {
    sortBy = 'default',
    order = 'asc',
    type = 'generic'
  } = sortConfig;

  return [...entities].sort((a, b) => {
    // Student-specific sorting
    if (type === 'student') {
      return sortStudentsLogic(a, b);
    }
    
    // Guardian-specific sorting
    if (type === 'guardian') {
      return sortGuardiansLogic(a, b);
    }
    
    // Teacher-specific sorting (add this when you need it)
    if (type === 'teacher') {
      return sortTeachersLogic(a, b);
    }
    
    // Generic sorting by ID (fallback)
    return a.id - b.id;
  });
};

// Student sorting logic
const sortStudentsLogic = (a, b) => {
  const sectionA = (a.section || '').toString().trim();
  const sectionB = (b.section || '').toString().trim();
  
  const sectionComparison = compareSections(sectionA, sectionB);
  if (sectionComparison !== 0) {
    return sectionComparison;
  }
  
  const lastNameA = (a.last_name || '').toLowerCase().trim();
  const lastNameB = (b.last_name || '').toLowerCase().trim();
  
  return lastNameA.localeCompare(lastNameB);
};

// Guardian sorting logic
const sortGuardiansLogic = (a, b) => {
  // First, sort by student grade
  const gradeA = parseInt(a.grade) || 0;
  const gradeB = parseInt(b.grade) || 0;
  
  if (gradeA !== gradeB) {
    return gradeA - gradeB;
  }
  
  // Then, sort by student section
  const sectionA = (a.section || '').toString().trim();
  const sectionB = (b.section || '').toString().trim();
  const sectionComparison = compareSections(sectionA, sectionB);
  
  if (sectionComparison !== 0) {
    return sectionComparison;
  }
  
  // Then, sort by student last name (the person they're guardian of)
  const studentLastNameA = (a.guardian_of?.split(' ').pop() || '').toLowerCase().trim();
  const studentLastNameB = (b.guardian_of?.split(' ').pop() || '').toLowerCase().trim();
  const nameComparison = studentLastNameA.localeCompare(studentLastNameB);
  
  if (nameComparison !== 0) {
    return nameComparison;
  }
  
  // Finally, sort by guardian last name
  const guardianLastNameA = (a.last_name || '').toLowerCase().trim();
  const guardianLastNameB = (b.last_name || '').toLowerCase().trim();
  
  return guardianLastNameA.localeCompare(guardianLastNameB);
};

// Teacher sorting logic (add when you create teachers)
const sortTeachersLogic = (a, b) => {
  // Sort by department first, then last name
  const departmentA = (a.department || '').toLowerCase().trim();
  const departmentB = (b.department || '').toLowerCase().trim();
  
  if (departmentA !== departmentB) {
    return departmentA.localeCompare(departmentB);
  }
  
  const lastNameA = (a.last_name || '').toLowerCase().trim();
  const lastNameB = (b.last_name || '').toLowerCase().trim();
  
  return lastNameA.localeCompare(lastNameB);
};

// Export for backward compatibility
export const sortStudents = (students) => sortEntities(students, { type: 'student' });
export const sortGuardians = (guardians) => sortEntities(guardians, { type: 'guardian' });