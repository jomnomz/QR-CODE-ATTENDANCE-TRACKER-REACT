import React, { useState, useEffect } from 'react';
import Button from '../../UI/Buttons/Button/Button';
import styles from './TeacherTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faPenToSquare, faTrashCan, faList,
} from "@fortawesome/free-solid-svg-icons";
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';

const TeacherTable = () => {
  const [currentClass, setCurrentClass] = useState('7');
  const [expandedRow, setExpandedRow] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Mock data for one teacher
    const mockTeacher = [
      {
        id: 1,
        employee_id: 'T001',
        first_name: 'John',
        middle_name: 'Michael',
        last_name: 'Smith',
        email: 'john.smith@school.edu',
        phone_number: '+1234567890',
        status: '',
        department: 'Mathematics',
        subjects: ['Algebra', 'Geometry'],
      }
    ];
    setTeachers(mockTeacher);
    setLoading(false);
  }, [currentClass]);

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setExpandedRow(null);
  };

  const toggleCard = (teacherId) => {
    if (expandedRow === teacherId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(teacherId);
    }
  };

  const grades = ['7', '8', '9', '10', '11', '12'];

  return (
    <div className={styles.teacherTableContainer}>
      <div className={styles.teachersTable}>
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
              <p>Showing {teachers.length} teacher/s in Grade {currentClass}</p>
          </div>
        </div>

        <table className={styles.teacherssTable}>
          <thead>
            <tr>
              <th>EMPLOYEE ID</th>
              <th>FIRST NAME</th>
              <th>MIDDLE NAME</th>
              <th>LAST NAME</th>
              <th>EMAIL ADDRESS</th>
              <th>PHONE NO.</th>
              <th>ACCOUNT STATUS</th>
              <th>INVITE</th>
              <th>CLASS LIST</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan="11" className={styles.noTeachers}>
                  No teachers found
                </td>
              </tr>
            ) : (
              teachers.map(teacher => (
                <React.Fragment key={teacher.id}>
                  <tr 
                    className={`${styles.studentRow} ${expandedRow === teacher.id ? styles.hiddenRow : ''}`}
                    onClick={() => toggleCard(teacher.id)}
                  >
                    <td>{teacher.employee_id}</td>
                    <td>{teacher.first_name}</td>
                    <td>{teacher.middle_name}</td>
                    <td>{teacher.last_name}</td>
                    <td>{teacher.email || "NA"}</td>
                    <td>{teacher.phone_number || "NA"}</td>
                    <td>{teacher.status || "NA"}</td>
                    <td>
                      <div className={styles.icon}>
                        <ForwardToInboxIcon sx={{ fontSize: 40, mb: -0.4 }} />
                      </div>
                    </td>
                    <td>
                      <div className={styles.icon}>
                        <FontAwesomeIcon icon={faList} />
                      </div>
                    </td>
                    <td>
                      <div className={styles.icon}>
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </div>
                    </td>
                    <td>
                      <div className={styles.icon}>
                        <FontAwesomeIcon icon={faTrashCan} />
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRow === teacher.id && (
                    <tr 
                      className={styles.expandRow}
                      onClick={() => toggleCard(teacher.id)}
                    >
                      <td colSpan="11">
                        <div className={`${styles.teacherCard} ${styles.expand} ${styles.show}`}>
                          <div className={styles.teacherHeader}>
                            {teacher.first_name} {teacher.last_name}
                          </div>
                          <div className={styles.teacherInfo}>
                            <strong>Teacher Details</strong>
                          </div>
                          <div className={styles.teacherInfo}>Employee ID: {teacher.employee_id}</div>
                          <div className={styles.teacherInfo}>Department: {teacher.department}</div>
                          <div className={styles.teacherInfo}>Full Name: {teacher.first_name} {teacher.middle_name} {teacher.last_name}</div>
                          <div className={styles.teacherInfo}>Email: {teacher.email || 'NA'}</div>
                          <div className={styles.teacherInfo}>Phone: {teacher.phone_number || 'NA'}</div>
                          <div className={styles.teacherInfo}>Account Status: {teacher.status|| 'NA'}</div>
                          <div className={styles.teacherInfo}>
                            Subjects: {teacher.subjects.join(', ')}
                          </div>
                          <div className={styles.teacherInfo}>
                            Hire Date: {new Date(teacher.hire_date).toLocaleDateString()}
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

export default TeacherTable;