import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; 
import Button from '../../UI/Buttons/Button/Button';
import styles from './StudentTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faQrcode, faPenToSquare, faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

const StudentTable = () => {
  const [currentClass, setCurrentClass] = useState('7');
  const [expandedRow, setExpandedRow] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudents(currentClass);
  }, [currentClass]);

  const fetchStudents = async (grade) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('grade', grade) 
        .order('last_name', { ascending: true }); 

      if (error) throw error;

      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setExpandedRow(null);
  };

  const toggleCard = (studentId) => {
    if (expandedRow === studentId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(studentId);
    }
  };

  const formatGradeSection = (grade, section) => {
    return `${grade}-${section}`;
  };

  const grades = ['7', '8', '9', '10', '11', '12']

  if (loading) {
    return (
      <div className={styles.studentTableContainer}>
        <div className={styles.loading}>Loading students...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.studentTableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.studentTableContainer}>
      <div className={styles.studentsTable}>
        <div className={styles.classContainers}>
          {grades.map(grade => (
            <Button 
              key={grade}
              label={`Grade ${grade}`}
              tabBottom={true}
              height="xs"
              width="xs-sm"
              color="grades"
              active={currentClass === grade}
              onClick={() => handleClassChange(grade)}
            >
              Grade {grade}
            </Button>
          ))}

          <div className={styles.tableInfo}>
              <p>Showing {students.length} student/s in Grade {currentClass}</p>
          </div>
        </div>

        <table className={styles.studentsTable}>
          <thead>
            <tr>
              <th>ID.NO</th>
              <th>FIRST NAME</th>
              <th>MIDDLE NAME</th>
              <th>LAST NAME</th>
              <th>GRADE</th>
              <th>SECTION</th>
              <th>EMAIL ADDRESS</th>
              <th>PHONE NO.</th>
              <th>QR CODE</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="11" className={styles.noStudents}>
                  No students found in Grade {currentClass}
                </td>
              </tr>
            ) : (
              students.map(student => (
                <React.Fragment key={student.id}>
                  <tr 
                    className={`${styles.studentRow} ${expandedRow === student.id ? styles.hiddenRow : ''}`}
                    onClick={() => toggleCard(student.id)}
                  >
                    <td>{student.student_id}</td>
                    <td>{student.first_name}</td>
                    <td>{student.middle_name}</td>
                    <td>{student.last_name}</td>
                    <td>{student.grade}</td>
                    <td>{student.section}</td>
                    <td>{student.email || "NA"}</td>
                    <td>{student.phone_number || "NA"}</td>
                    <td><div className={styles.icon}>
                      <FontAwesomeIcon icon={faQrcode} />
                    </div>
                    </td>
                    <td><div className={styles.icon}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </div>
                    </td>
                    <td><div className={styles.icon}>
                      <FontAwesomeIcon icon={faTrashCan} />
                    </div>
                    </td>
                  </tr>
                  
                  {expandedRow === student.id && (
                    <tr 
                      className={styles.expandRow}
                      onClick={() => toggleCard(student.id)}
                    >
                      <td colSpan="11">
                        <div className={`${styles.studentCard} ${styles.expand} ${styles.show}`}>
                          <div className={styles.studentHeader}>
                            {student.first_name} {student.last_name}
                          </div>
                          <div className={styles.studentInfo}>
                            <strong>Student Details</strong>
                          </div>
                          <div className={styles.studentInfo}>Student ID: {student.student_id}</div>
                          <div className={styles.studentInfo}>Grade & Section: {formatGradeSection(student.grade, student.section)}</div>
                          <div className={styles.studentInfo}>Full Name: {student.first_name} {student.middle_name} {student.last_name}</div>
                          <div className={styles.studentInfo}>Email: {student.email || 'NA'}</div>
                          <div className={styles.studentInfo}>Phone: {student.phone_number || 'NA'}</div>
                          <div className={styles.studentInfo}>
                            Added: {new Date(student.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;