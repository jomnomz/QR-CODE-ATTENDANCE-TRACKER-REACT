import React from 'react';
import { formatStudentName, formatGradeSection } from '../../../Utils/Formatters'; 
import styles from './StudentList.module.css';

function StudentList({ 
  students = [], 
  maxHeight = "100px", // Control height, not count
  title = "Students included",
  showNumbers = true, // Show 1., 2., 3. numbering
  variant = 'multiple' // 'multiple' or 'single'
}) {
  if (students.length === 0) {
    return null;
  }

  // If single student variant and we have exactly 1 student
  if (variant === 'single' && students.length === 1) {
    const student = students[0];
    return (
      <div className={styles.singleStudentContainer}>
        <div className={styles.singleStudentHeader}>{title || 'Student:'}</div>
        <div className={styles.singleStudentDetails}>
          <strong>{student.lrn}</strong> | {formatStudentName(student)} | {formatGradeSection(student)}
        </div>
      </div>
    );
  }

  // Multiple students variant (or single variant with multiple students)
  return (
    <div className={styles.studentListContainer}>
      <div className={styles.listHeader}>
        {title} ({students.length}):
      </div>
      <div className={styles.studentList} style={{ maxHeight }}>
        {students.map((student, index) => (
          <div key={student.id} className={styles.studentItem}>
            {showNumbers && (
              <div className={styles.studentNumber}>{index + 1}.</div>
            )}
            <div className={styles.studentDetails}>
              <div className={styles.studentName}>
                <strong>{student.lrn}</strong> | {formatStudentName(student)} | {formatGradeSection(student)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentList;