import React, { useMemo } from 'react';
import { useAttendance } from '../../Hooks/useAttendance'; 
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { grades, shouldHandleRowClick, attendanceTableColumns } from '../../../Utils/tableHelpers';
import { formatStudentName, formatDate, formatNA, formatTime, formatAttendanceStatus, formatGradeSection } from '../../../Utils/Formatters'; 
import { sortStudents } from '../../../Utils/CompareHelpers';
import Button from '../../UI/Buttons/Button/Button';
import styles from './AttendanceTable.module.css';

const AttendanceTable = () => {
  const { currentClass, attendances, loading, error, currentDate, changeClass } = useAttendance();
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();

  // Sort attendances
  const sortedAttendances = useMemo(() => sortStudents(attendances), [attendances]);

  const handleClassChange = (className) => {
    changeClass(className);
    toggleRow(null);
  };

  const handleRowClick = (attendanceId, e) => {
    if (shouldHandleRowClick(false, e.target)) {
      toggleRow(attendanceId);
    }
  };

  const formatStatusWithStyle = (status) => {
    const baseClass = styles.status;
    const statusClass = status === 'present' ? styles.statusPresent : styles.statusAbsent;
    return {
      text: formatAttendanceStatus(status),
      className: `${baseClass} ${statusClass}`
    };
  };

  const renderExpandedRow = (attendance) => {
    const statusInfo = formatStatusWithStyle(attendance.status);
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(attendance.id) ? styles.expandRowActive : ''}`}>
        <td colSpan={attendanceTableColumns.length}>
          <div 
            className={`${styles.attendanceCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.attendanceHeader}>
              {formatStudentName(attendance)}
            </div>
            <div className={styles.studentInfo}>
              <strong>Attendance Details for Today</strong>
            </div>
            <div className={styles.attendanceInfo}>LRN: {formatNA(attendance.lrn)}</div>
            <div className={styles.attendanceInfo}>Full Name: {formatStudentName(attendance)}</div>
            <div className={styles.attendanceInfo}>Grade & Section: {formatGradeSection(attendance)}</div>
            <div className={styles.attendanceInfo}>Time In: {formatTime(attendance.time_in)}</div>
            <div className={styles.attendanceInfo}>Time Out: {formatTime(attendance.time_out)}</div>
            <div className={styles.attendanceInfo}>Date: {formatDate(attendance.date)}</div>
            <div className={styles.attendanceInfo}>
              Status: <span className={statusInfo.className}>{statusInfo.text}</span>
            </div>
            {attendance.created_at && (
              <div className={styles.attendanceInfo}>
                Record Updated: {formatDate(attendance.created_at)}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className={styles.attendanceTableContainer}>
        <div className={styles.loading}>Loading attendance records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.attendanceTableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.attendanceTableContainer} ref={tableRef}>
      <div className={styles.attendanceTable}>
        <div className={styles.classContainers}>
          {/* ADDED: "All" button */}
          <Button 
            label="All"
            tabBottom={true}
            height="xs"
            width="xs-sm"
            color="grades"
            active={currentClass === 'all'}
            onClick={() => handleClassChange('all')}
          >
            All
          </Button>
          
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
            <p>
              Showing {sortedAttendances.length} attendance records for {currentDate}
              {currentClass === 'all' 
                ? ' across all grades' 
                : ` in Grade ${currentClass}`}
            </p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.attendancesTable}>
            <thead>
              <tr>
                {attendanceTableColumns.map(column => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAttendances.length === 0 ? (
                <tr>
                  <td colSpan={attendanceTableColumns.length} className={styles.noAttendance}>
                    {currentClass === 'all' 
                      ? `No attendance records found for ${currentDate} across all grades` 
                      : `No attendance records found for ${currentDate} in Grade ${currentClass}`}
                  </td>
                </tr>
              ) : (
                sortedAttendances.map((attendance, index) => {
                  const visibleRowIndex = sortedAttendances
                    .slice(0, index)
                    .filter(a => !isRowExpanded(a.id))
                    .length;
                  
                  const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;
                  const statusInfo = formatStatusWithStyle(attendance.status);

                  return (
                    <React.Fragment key={attendance.id}>
                      {!isRowExpanded(attendance.id) && (
                        <tr 
                          className={`${styles.studentRow} ${rowColorClass}`}
                          onClick={(e) => handleRowClick(attendance.id, e)}
                        >
                          <td>{formatNA(attendance.lrn)}</td>
                          <td>{formatNA(attendance.first_name)}</td>
                          <td>{formatNA(attendance.last_name)}</td>
                          <td>{formatGradeSection(attendance)}</td>
                          <td>{formatTime(attendance.time_in)}</td>
                          <td>{formatTime(attendance.time_out)}</td>
                          <td>{formatDate(attendance.date)}</td>
                          <td>
                            <span className={statusInfo.className}>
                              {statusInfo.text}
                            </span>
                          </td>
                        </tr>
                      )}
                      {renderExpandedRow(attendance)}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTable;