import React, { useState, useEffect, useMemo } from 'react';
import { useRowExpansion } from '../../hooks/useRowExpansion'; 
import { grades, shouldHandleRowClick, attendanceTableColumns } from '../../../Utils/tableHelpers';
import { formatStudentName, formatDate, formatNA, formatAttendanceStatus } from '../../../Utils/Formatters'; 
import { sortEntities } from '../../../Utils/SortEntities'; 
import Button from '../../UI/Buttons/Button/Button';
import styles from './AttendanceTable.module.css';
import { useAttendance } from '../../Hooks/useAttendance';

const AttendanceTable = () => {
  const { 
    currentClass,
    attendances,
    loading,
    error,
    currentDate,
    changeClass,
    refreshAttendance
  } = useAttendance();
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();

  // FIXED: Format time for display - The time in database is already Philippines time
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // The time in database is already Philippines time (UTC+8)
      // Scanner stores it as "19:19:17" for 7:19 PM Philippines time
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      
      // Create a date object with the time (date doesn't matter)
      const date = new Date();
      date.setHours(hours, minutes, seconds);
      
      // Format as Philippines time
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString;
    }
  };

  // Format time without seconds for cleaner display
  const formatTimeDisplayShort = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Create a date object with the time
      const date = new Date();
      date.setHours(hours, minutes);
      
      // Format as Philippines time without seconds
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString;
    }
  };

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
    let statusClass;
    
    switch (status) {
      case 'present':
        statusClass = styles.statusPresent;
        break;
      case 'late':
        statusClass = styles.statusLate;
        break;
      case 'absent':
        statusClass = styles.statusAbsent;
        break;
      default:
        statusClass = styles.statusAbsent;
    }
    
    return {
      text: formatAttendanceStatus(status),
      className: `${baseClass} ${statusClass}`
    };
  };

  // Sort attendances
  const sortedAttendances = useMemo(() => {
    return sortEntities(attendances, { type: 'student' });
  }, [attendances]);

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
              <strong>Attendance Details</strong>
            </div>
            <div className={styles.attendanceInfo}>LRN: {formatNA(attendance.lrn)}</div>
            <div className={styles.attendanceInfo}>Full Name: {formatStudentName(attendance)}</div>
            <div className={styles.attendanceInfo}>Grade & Section: {attendance.grade} - {attendance.section}</div>
            <div className={styles.attendanceInfo}>Time In: {formatTimeDisplay(attendance.time_in)}</div>
            <div className={styles.attendanceInfo}>Time Out: {formatTimeDisplay(attendance.time_out)}</div>
            <div className={styles.attendanceInfo}>Date: {formatDate(attendance.date)}</div>
            <div className={styles.attendanceInfo}>
              Status: <span className={statusInfo.className}>{statusInfo.text}</span>
            </div>
            <div className={styles.attendanceInfo}>
              Scan Type: {formatNA(attendance.scan_type)}
            </div>
            {attendance.created_at && (
              <div className={styles.attendanceInfo}>
                Record Created: {formatDate(attendance.created_at)}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderRow = (attendance, index) => {
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
            <td>{attendance.grade} - {attendance.section}</td>
            <td>{formatTimeDisplayShort(attendance.time_in)}</td>
            <td>{formatTimeDisplayShort(attendance.time_out)}</td>
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
                sortedAttendances.map((attendance, index) => renderRow(attendance, index))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTable;