import React, { useState, useEffect } from 'react';
import Button from '../../UI/Buttons/Button/Button';
import styles from './AttendanceTable.module.css';

const AttendanceTable = () => {
  const [currentClass, setCurrentClass] = useState('7');
  const [expandedRow, setExpandedRow] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const mockAttendance = [
      {
        id: '2022-00012-PQ-0',
        first_name: 'Flord',
        middle_name:'Ogabang',
        last_name:'Quijote',
        grade_section: '7-1',
        time_in: '7:41:13 am',
        time_out: '4:30:45 pm',
        date: '05/30/2025',
        status: 'Present',
      }
    ];
    setAttendances(mockAttendance);
    setLoading(false);
  }, [currentClass]);

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setExpandedRow(null);
  };

  const toggleCard = (attendanceId) => {
    if (expandedRow === attendanceId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(attendanceId);
    }
  };

  const grades = ['7', '8', '9', '10', '11', '12'];

  return (
    <div className={styles.attendanceTableContainer}>
      <div className={styles.attendanceTable}>
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
              <p>Showing {attendances.length} Guardian/s in Grade {currentClass}</p>
          </div>
        </div>

        <table className={styles.attendancesTable}>
          <thead>
            <tr>
              <th>ID.NO</th>
              <th>FIRST NAME</th>
              <th>LAST NAME</th>
              <th>GRADE AND SECTION</th>
              <th>TIME IN</th>
              <th>TIME OUT</th>
              <th>DATE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {attendances.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.noAttendance}>
                  No Attendance found
                </td>
              </tr>
            ) : (
              attendances.map(attendance => (
                <React.Fragment key={attendance.id}>
                  <tr 
                    className={`${styles.studentRow} ${expandedRow === attendance.id ? styles.hiddenRow : ''}`}
                    onClick={() => toggleCard(attendance.id)}
                  >
                    <td>{attendance.id}</td>
                    <td>{attendance.first_name}</td>
                    <td>{attendance.last_name}</td>
                    <td>{attendance.grade_section}</td>
                    <td>{attendance.time_in}</td>
                    <td>{attendance.time_out}</td>
                    <td>{attendance.date}</td>
                    <td>{attendance.status}</td>
                  </tr>
                  
                  {expandedRow === attendance.id && (
                    <tr 
                      className={styles.expandRow}
                      onClick={() => toggleCard(attendance.id)}
                    >
                      <td colSpan="8">
                        <div className={`${styles.attendanceCard} ${styles.expand} ${styles.show}`}>
                          <div className={styles.attendanceHeader}>
                            {attendance.first_name} {attendance.last_name}
                          </div>
                          <div className={styles.studentInfo}>
                            <strong>Attendance Details</strong>
                          </div>
                          <div className={styles.attendanceInfo}>Student ID: {attendance.id}</div>
                          <div className={styles.attendanceInfo}>Full Name: {attendance.first_name} {attendance.middle_name} {attendance.last_name}</div>
                          <div className={styles.attendanceInfo}>Time In: {attendance.time_in}</div>
                          <div className={styles.attendanceInfo}>Time Out: {attendance.time_out}</div>
                          <div className={styles.attendanceInfo}>Date: {attendance.date}</div>
                          <div className={styles.attendanceInfo}>Status: {attendance.status}</div>
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

export default AttendanceTable;