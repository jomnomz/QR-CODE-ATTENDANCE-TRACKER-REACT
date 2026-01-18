import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { grades, shouldHandleRowClick } from '../../../Utils/tableHelpers';
import { formatStudentName, formatDate, formatNA, formatAttendanceStatus } from '../../../Utils/Formatters'; 
import { sortEntities } from '../../../Utils/SortEntities'; 
import Button from '../../UI/Buttons/Button/Button';
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';
import styles from './AttendanceTable.module.css';
import { useAttendance } from '../../Hooks/useAttendance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { supabase } from '../../../lib/supabase';

// Custom Time Picker component
const TimePicker = ({ value, onChange, name }) => {
  const handleChange = (e) => {
    const newTime = e.target.value;
    if (onChange) {
      onChange({ target: { name, value: newTime } });
    }
  };
  
  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { name, value: '' } });
    }
  };
  
  return (
    <div className={styles.timeInputContainer}>
      <input
        type="time"
        name={name}
        value={value || ''}
        onChange={handleChange}
        className={styles.timeInput}
        step="60"
      />
      {value && (
        <button 
          type="button" 
          onClick={handleClear}
          className={styles.clearTimeButton}
          title="Clear time"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      )}
    </div>
  );
};

const AttendanceTable = ({
  searchTerm = '',
  selectedSection = '',
  onSectionsUpdate,
  onGradeUpdate,
  onClearSectionFilter,
  onSectionSelect,
  availableSections = [],
  loading: parentLoading = false,
  selectedDate = null,
  statusFilter = 'all',
  onStatsUpdate
}) => {
  const { 
    currentClass,
    attendances,
    loading: attendanceLoading,
    error,
    changeClass,
    fetchAttendanceForDate
  } = useAttendance();
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { success, error: toastError } = useToast();
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    time_in: '',
    time_out: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Format time functions
  const formatTimeDisplay = useCallback((timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, seconds);
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      return timeString;
    }
  }, []);

  const formatTimeDisplayShort = useCallback((timeString) => {
    if (!timeString) return '—';
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      return timeString;
    }
  }, []);

  const formatTimeForInput = useCallback((timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      return '';
    }
  }, []);

  // Calculate status
  const calculateStatus = useCallback(async (timeIn, studentGrade) => {
    if (!timeIn) return { status: 'absent', shouldClearTimes: false };
    
    try {
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('id')
        .eq('grade_level', studentGrade)
        .single();
      
      if (gradeError || !gradeData) {
        return { status: 'absent', shouldClearTimes: false };
      }
      
      const gradeId = gradeData.id;
      const { data: schedule, error: scheduleError } = await supabase
        .from('grade_schedules')
        .select('*')
        .eq('grade_id', gradeId)
        .single();
      
      if (scheduleError || !schedule) {
        return calculateStatusFallback(timeIn);
      }
      
      const [scanHour, scanMinute] = timeIn.split(':').map(Number);
      const [classStartHour, classStartMinute] = schedule.class_start.split(':').map(Number);
      const [classEndHour, classEndMinute] = schedule.class_end.split(':').map(Number);
      
      const scanTotalMinutes = scanHour * 60 + scanMinute;
      const classStartMinutes = classStartHour * 60 + classStartMinute;
      const classEndMinutes = classEndHour * 60 + classEndMinute;
      const gracePeriod = schedule.grace_period_minutes || 15;
      
      if (scanTotalMinutes < classStartMinutes) {
        return { status: 'present', shouldClearTimes: false };
      } else if (scanTotalMinutes <= classStartMinutes + gracePeriod) {
        return { status: 'present', shouldClearTimes: false };
      } else if (scanTotalMinutes <= classEndMinutes) {
        return { status: 'late', shouldClearTimes: false };
      } else {
        return { status: 'absent', shouldClearTimes: true };
      }
      
    } catch (error) {
      return calculateStatusFallback(timeIn);
    }
  }, []);

  const calculateStatusFallback = useCallback((timeIn) => {
    if (!timeIn) return { status: 'absent', shouldClearTimes: false };
    try {
      const [hours, minutes] = timeIn.split(':').map(Number);
      const scanTotalMinutes = hours * 60 + minutes;
      const classStartMinutes = 8 * 60;
      const classEndMinutes = 15 * 60;
      const gracePeriod = 15;
      
      if (scanTotalMinutes <= classStartMinutes + gracePeriod) {
        return { status: 'present', shouldClearTimes: false };
      } else if (scanTotalMinutes <= classEndMinutes) {
        return { status: 'late', shouldClearTimes: false };
      } else {
        return { status: 'absent', shouldClearTimes: true };
      }
    } catch (error) {
      return { status: 'absent', shouldClearTimes: false };
    }
  }, []);

  // Edit functions
  const startEdit = useCallback((attendance) => {
    setEditingId(attendance.id);
    setEditFormData({
      time_in: formatTimeForInput(attendance.time_in),
      time_out: formatTimeForInput(attendance.time_out)
    });
    setValidationErrors({});
  }, [formatTimeForInput]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditFormData({
      time_in: '',
      time_out: ''
    });
    setValidationErrors({});
  }, []);

  const handleTimeChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [validationErrors]);

  const validateForm = useCallback(() => {
    const errors = {};
    
    if (editFormData.time_out && !editFormData.time_in) {
      errors.time_out = 'Time out requires time in';
    }
    
    if (editFormData.time_in && editFormData.time_out) {
      const [inHours, inMinutes] = editFormData.time_in.split(':').map(Number);
      const [outHours, outMinutes] = editFormData.time_out.split(':').map(Number);
      
      const timeIn = new Date();
      timeIn.setHours(inHours, inMinutes, 0, 0);
      
      const timeOut = new Date();
      timeOut.setHours(outHours, outMinutes, 0, 0);
      
      if (timeOut < timeIn) {
        errors.time_out = 'Time out cannot be earlier than time in';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editFormData]);

  const saveEdit = useCallback(async (attendanceId, studentGrade) => {
    if (!validateForm()) {
      toastError('Please fix validation errors');
      return;
    }
    
    setSaving(true);
    try {
      let updateData;
      let statusResult;
      
      if (editFormData.time_in) {
        statusResult = await calculateStatus(editFormData.time_in, studentGrade);
        
        if (statusResult.shouldClearTimes) {
          updateData = {
            time_in: null,
            time_out: null,
            status: 'absent',
            scan_type: null
          };
        } else {
          updateData = {
            time_in: editFormData.time_in ? `${editFormData.time_in}:00` : null,
            time_out: editFormData.time_out ? `${editFormData.time_out}:00` : null,
            status: statusResult.status
          };
        }
      } else {
        updateData = {
          time_in: null,
          time_out: null,
          status: 'absent',
          scan_type: null
        };
      }
      
      const { error } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', attendanceId);
      
      if (error) throw error;
      
      if (statusResult?.shouldClearTimes) {
        success('Time entered is after class. Student marked as absent with times cleared.');
      } else if (editFormData.time_in) {
        success(`Attendance updated successfully (${statusResult?.status || 'absent'})`);
      } else {
        success('Student marked as absent');
      }
      
      cancelEdit();
      
      // Refresh data for current date and class
      await fetchAttendanceForDate(selectedDate, currentClass);
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      toastError(`Failed to update attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [validateForm, editFormData, calculateStatus, cancelEdit, selectedDate, currentClass, fetchAttendanceForDate, toastError, success]);

  // Event handlers
  const handleClassChange = useCallback((className) => {
    changeClass(className);
    toggleRow(null);
    cancelEdit();
    
    if (selectedSection && onSectionSelect) {
      onSectionSelect('');
    }
    
    if (selectedSection && onClearSectionFilter) {
      onClearSectionFilter();
    }
    
    fetchAttendanceForDate(selectedDate, className);
  }, [changeClass, toggleRow, cancelEdit, selectedSection, onSectionSelect, onClearSectionFilter, selectedDate, fetchAttendanceForDate]);

  const handleSectionFilter = useCallback((section) => {
    if (onSectionSelect) {
      onSectionSelect(section);
    }
  }, [onSectionSelect]);

  const handleRowClick = useCallback((attendanceId, e) => {
    if (shouldHandleRowClick(editingId !== null, e.target)) {
      toggleRow(attendanceId);
    }
  }, [editingId, toggleRow]);

  const formatStatusWithStyle = useCallback((status) => {
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
  }, []);

  // Calculate stats for the parent component
  const calculateStats = useCallback((filteredData) => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      total: filteredData.length
    };

    filteredData.forEach(attendance => {
      switch (attendance.status) {
        case 'present':
          stats.present++;
          break;
        case 'absent':
          stats.absent++;
          break;
        case 'late':
          stats.late++;
          break;
      }
    });

    return stats;
  }, []);

  // Data processing
  const allUniqueSections = useMemo(() => {
    const sections = attendances
      .map(attendance => attendance.section || '')
      .filter(section => section && section.trim() !== '');
    
    return [...new Set(sections)].sort();
  }, [attendances]);

  const currentGradeSections = useMemo(() => {
    if (currentClass === 'all') return allUniqueSections;
    
    const sections = attendances
      .filter(attendance => attendance.grade === currentClass)
      .map(attendance => attendance.section || '')
      .filter(section => section && section.trim() !== '');
    
    return [...new Set(sections)].sort();
  }, [attendances, currentClass, allUniqueSections]);

  const sectionsToShowInDropdown = useMemo(() => {
    return currentGradeSections;
  }, [currentGradeSections]);

  // Filter and sort attendances
  const sortedAttendances = useMemo(() => {
    let filtered = attendances;
    
    // Apply date filter
    if (selectedDate) {
      filtered = filtered.filter(attendance => attendance.date === selectedDate);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attendance => 
        attendance.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Apply grade filter
    if (currentClass !== 'all') {
      filtered = filtered.filter(attendance => attendance.grade === currentClass);
    }
    
    // Apply section filter
    if (selectedSection) {
      filtered = filtered.filter(attendance => attendance.section === selectedSection);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(attendance => 
        attendance.lrn?.toLowerCase().includes(searchLower) ||
        attendance.first_name?.toLowerCase().includes(searchLower) ||
        attendance.last_name?.toLowerCase().includes(searchLower) ||
        attendance.grade?.toString().toLowerCase().includes(searchLower) ||
        attendance.section?.toString().toLowerCase().includes(searchLower) ||
        attendance.status?.toLowerCase().includes(searchLower) ||
        attendance.scan_type?.toLowerCase().includes(searchLower)
      );
    }
    
    return sortEntities(filtered, { type: 'student' });
  }, [attendances, selectedDate, statusFilter, currentClass, selectedSection, searchTerm]);

  // Effects
  useEffect(() => {
    if (selectedSection && currentClass !== 'all') {
      const isValidSection = currentGradeSections.includes(selectedSection);
      if (!isValidSection && onSectionSelect) {
        onSectionSelect('');
      }
    }
  }, [currentClass, currentGradeSections, selectedSection, onSectionSelect]);

  useEffect(() => {
    if (onSectionsUpdate) {
      onSectionsUpdate(allUniqueSections);
    }
  }, [allUniqueSections, onSectionsUpdate]);

  useEffect(() => {
    if (onGradeUpdate) {
      onGradeUpdate(currentClass);
    }
  }, [currentClass, onGradeUpdate]);

  // Update stats when filtered data changes
  useEffect(() => {
    if (onStatsUpdate) {
      const stats = calculateStats(sortedAttendances);
      onStatsUpdate(stats);
    }
  }, [sortedAttendances, onStatsUpdate, calculateStats]);

  // Fetch data when date or class changes
  useEffect(() => {
    fetchAttendanceForDate(selectedDate, currentClass);
  }, [selectedDate, currentClass, fetchAttendanceForDate]);

  // Render helpers
  const renderTimePicker = useCallback((fieldName) => (
    <TimePicker
      name={fieldName}
      value={editFormData[fieldName]}
      onChange={handleTimeChange}
    />
  ), [editFormData, handleTimeChange]);

  const renderActionButtons = useCallback((attendanceId, studentGrade) => (
    <div className={styles.editActions}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          saveEdit(attendanceId, studentGrade);
        }}
        disabled={saving}
        className={styles.saveBtn}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          cancelEdit();
        }}
        disabled={saving}
        className={styles.cancelBtn}
      >
        Cancel
      </button>
    </div>
  ), [saveEdit, cancelEdit, saving]);

  const renderEditCell = useCallback((attendance) => (
    <div className={styles.editCell}>
      {editingId === attendance.id ? (
        renderActionButtons(attendance.id, attendance.grade)
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => {
              e.stopPropagation();
              startEdit(attendance);
            }}
            className="action-button"
            title="Edit attendance times"
          />
        </div>
      )}
    </div>
  ), [editingId, renderActionButtons, startEdit]);

  const renderExpandedRow = useCallback((attendance) => {
    const statusInfo = formatStatusWithStyle(attendance.status);
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(attendance.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="9">
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
  }, [formatTimeDisplay, formatStatusWithStyle, isRowExpanded]);

  const renderRow = useCallback((attendance, index) => {
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
            className={`${styles.studentRow} ${rowColorClass} ${editingId === attendance.id ? styles.editingRow : ''}`}
            onClick={(e) => handleRowClick(attendance.id, e)}
          >
            <td>{formatNA(attendance.first_name)}</td>
            <td>{formatNA(attendance.last_name)}</td>
            <td>{attendance.grade}</td>
            <td>{attendance.section}</td>
            <td>
              {editingId === attendance.id ? (
                <div className={styles.timeCell}>
                  {renderTimePicker('time_in')}
                </div>
              ) : (
                <div className={styles.timeCell}>
                  <div className={styles.timeDisplay}>
                    {formatTimeDisplayShort(attendance.time_in)}
                  </div>
                </div>
              )}
            </td>
            <td>
              {editingId === attendance.id ? (
                <div className={styles.timeCell}>
                  {renderTimePicker('time_out')}
                  {validationErrors.time_out && (
                    <div className={styles.errorMessage}>{validationErrors.time_out}</div>
                  )}
                </div>
              ) : (
                <div className={styles.timeCell}>
                  <div className={styles.timeDisplay}>
                    {formatTimeDisplayShort(attendance.time_out)}
                  </div>
                </div>
              )}
            </td>
            <td>{formatDate(attendance.date)}</td>
            <td>
              <span className={statusInfo.className}>
                {statusInfo.text}
              </span>
            </td>
            <td>
              {renderEditCell(attendance)}
            </td>
          </tr>
        )}
        {renderExpandedRow(attendance)}
      </React.Fragment>
    );
  }, [sortedAttendances, isRowExpanded, editingId, handleRowClick, renderTimePicker, validationErrors, formatTimeDisplayShort, renderEditCell, renderExpandedRow, formatStatusWithStyle]);

  const getTableInfoMessage = useCallback(() => {
    const attendanceCount = sortedAttendances.length;
    
    let message = '';
    
    if (selectedDate) {
      message += `Date: ${selectedDate}`;
    } else {
      message += 'Today';
    }
    
    message += ` - Showing ${attendanceCount} attendance records`;
    
    if (selectedSection) {
      message += ` in Section ${selectedSection}`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
    } else if (currentClass !== 'all') {
      message += ` in Grade ${currentClass}`;
    }
    
    if (statusFilter !== 'all') {
      message += ` - Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`;
    }
    
    if (searchTerm) {
      message += ` matching "${searchTerm}"`;
    }
    
    return message;
  }, [sortedAttendances.length, selectedDate, selectedSection, currentClass, statusFilter, searchTerm]);

  // Loading and error states
  if (parentLoading || attendanceLoading) {
    return (
      <div className={styles.attendanceTableContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.attendanceTableContainer}>
        <div className={styles.error}>
          <h3>Error Loading Attendance</h3>
          <p>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => fetchAttendanceForDate(selectedDate, currentClass)}
          >
            Retry
          </button>
        </div>
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
            <p>{getTableInfoMessage()}</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.attendancesTable}>
            <thead>
              <tr>
                <th>FIRST NAME</th>
                <th>LAST NAME</th>
                <th>GRADE</th>
                <th>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderRow}>
                      <span>SECTION</span>
                      <SectionDropdown 
                        availableSections={sectionsToShowInDropdown}
                        selectedValue={selectedSection}
                        onSelect={handleSectionFilter}
                      />
                    </div>
                  </div>
                </th>
                <th>TIME IN</th>
                <th>TIME OUT</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>EDIT</th>
              </tr>
            </thead>
            <tbody>
              {sortedAttendances.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.noAttendance}>
                    {getTableInfoMessage()}
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