import React, { useState, useEffect } from 'react';
import styles from './GradeSchedulesTable.module.css';
import { EntityService } from '../../../Utils/EntityService';
import { useRowExpansion } from '../../hooks/useRowExpansion';
import { useEntityEdit } from '../../hooks/useEntityEdit';
import DeleteEntityModal from '../../Modals/DeleteEntityModal/DeleteEntityModal';
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { supabase } from '../../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPenToSquare, 
  faTrashCan,
  faCircle as fasCircle 
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as farCircleRegular } from "@fortawesome/free-regular-svg-icons";

// Time formatter function - returns AM/PM format
const formatTimeAMPM = (timeString) => {
  if (!timeString) return 'N/A';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', timeString, error);
    return timeString;
  }
};

// Format duration (minutes to readable format)
const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return 'N/A';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  } else if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
};

// Date formatter function
const formatDateTimeLocal = (dateString) => {
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

// Sorting function for schedules (numerical grade sorting)
const sortSchedules = (schedules) => {
  return [...schedules].sort((a, b) => {
    const gradeA = parseInt(a.grade_level) || 0;
    const gradeB = parseInt(b.grade_level) || 0;
    
    return gradeA - gradeB;
  });
};

// Calculate total class duration
const calculateClassDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  try {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    let startTotal = startHours * 60 + startMinutes;
    let endTotal = endHours * 60 + endMinutes;
    
    // Handle overnight classes (e.g., 20:00 to 02:00)
    if (endTotal < startTotal) {
      endTotal += 24 * 60; // Add 24 hours
    }
    
    return endTotal - startTotal;
  } catch (error) {
    return 0;
  }
};

const GradeSchedulesTable = ({ 
  searchTerm = '',
  onSelectedSchedulesUpdate,
  selectedSchedules = [],
  onSingleDeleteClick
}) => {
  const [schedules, setSchedules] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { expandedRow, toggleRow, isRowExpanded, tableRef } = useRowExpansion();
  const { success, error: toastError } = useToast();
  
  const scheduleService = new EntityService('grade_schedules');
  const gradeService = new EntityService('grades');

  // Fetch function for grade schedules
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch ALL grades first to check what exists
      const { data: allGrades, error: gradesError } = await supabase
        .from('grades')
        .select('id, grade_level')
        .order('grade_level');
      
      if (gradesError) throw gradesError;
      
      // Fetch schedules with grade information
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('grade_schedules')
        .select(`
          *,
          grades (
            id,
            grade_level
          )
        `);
      
      if (schedulesError) throw schedulesError;
      
      setGrades(allGrades || []);
      
      // Transform the data to include grade level in the schedule object
      const transformedSchedules = (schedulesData || []).map(schedule => ({
        ...schedule,
        grade_level: schedule.grades?.grade_level || 'Unknown',
        grade_id: schedule.grades?.id || null
      }));
      
      // Sort the data numerically by grade
      const sortedData = sortSchedules(transformedSchedules);
      
      setSchedules(sortedData);
      
    } catch (err) {
      console.error('Error fetching grade schedules:', err);
      setError(err.message);
      setSchedules([]);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Entity edit hook
  const {
    editingId,
    editFormData,
    saving,
    validationErrors,
    startEdit,
    cancelEdit,
    updateEditField,
    saveEdit
  } = useEntityEdit(schedules, setSchedules, 'schedule', fetchSchedules);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchSchedules();
    
    // Subscribe to changes in grade_schedules table
    const scheduleSubscription = supabase
      .channel('grade-schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grade_schedules'
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();
    
    // Also subscribe to grades table changes
    const gradeSubscription = supabase
      .channel('grades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grades'
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      scheduleSubscription.unsubscribe();
      gradeSubscription.unsubscribe();
    };
  }, []);

  // Filter and sort schedules based on search term
  const filteredSchedules = sortSchedules(
    schedules.filter(schedule => {
      const searchLower = searchTerm.toLowerCase();
      const gradeLevel = schedule.grade_level?.toString() || '';
      const classStart = schedule.class_start || '';
      const classEnd = schedule.class_end || '';
      const gracePeriod = schedule.grace_period_minutes?.toString() || '';
      
      return (
        gradeLevel.toLowerCase().includes(searchLower) ||
        formatTimeAMPM(classStart).toLowerCase().includes(searchLower) ||
        formatTimeAMPM(classEnd).toLowerCase().includes(searchLower) ||
        gracePeriod.includes(searchLower)
      );
    })
  );

  // Handle individual schedule selection
  const handleScheduleSelect = (scheduleId, e) => {
    e.stopPropagation();
    const newSelected = selectedSchedules.includes(scheduleId)
      ? selectedSchedules.filter(id => id !== scheduleId)
      : [...selectedSchedules, scheduleId];
    
    if (onSelectedSchedulesUpdate) {
      onSelectedSchedulesUpdate(newSelected);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const allVisibleIds = filteredSchedules.map(schedule => schedule.id);
    const allSelected = allVisibleIds.every(id => selectedSchedules.includes(id));
    
    const newSelected = allSelected
      ? selectedSchedules.filter(id => !allVisibleIds.includes(id))
      : [...new Set([...selectedSchedules, ...allVisibleIds])];
    
    if (onSelectedSchedulesUpdate) {
      onSelectedSchedulesUpdate(newSelected);
    }
  };

  const allVisibleSelected = filteredSchedules.length > 0 && 
    filteredSchedules.every(schedule => selectedSchedules.includes(schedule.id));

  // Delete handler
  const handleDeleteClick = (schedule, e) => {
    e.stopPropagation();
    if (onSingleDeleteClick) {
      onSingleDeleteClick(schedule, 'schedule');
    } else {
      setSelectedSchedule(schedule);
      setIsDeleteModalOpen(true);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async (id) => {
    setIsDeleting(true);
    try {
      await scheduleService.delete(id);
      success('Schedule deleted successfully');
      fetchSchedules();
      // Remove from selected if it was selected
      const newSelected = selectedSchedules.filter(selectedId => selectedId !== id);
      if (onSelectedSchedulesUpdate) {
        onSelectedSchedulesUpdate(newSelected);
      }
    } catch (err) {
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSelectedSchedule(null);
    }
  };

  // Edit handlers
  const handleEditClick = (schedule, e) => {
    e.stopPropagation();
    startEdit(schedule);
  };

  const handleSaveEdit = async (id, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(id, null, async (id, data) => {
      // Get grade ID from selected grade level
      const selectedGrade = grades.find(g => g.grade_level === data.grade_level);
      if (!selectedGrade) {
        throw new Error('Selected grade not found');
      }
      
      return await scheduleService.update(id, {
        grade_id: selectedGrade.id,
        class_start: data.class_start,
        class_end: data.class_end,
        grace_period_minutes: parseInt(data.grace_period_minutes) || 15
      });
    });

    if (result.success) {
      success('Schedule updated successfully');
    }
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    cancelEdit();
  };

  // Render edit cell
  const renderEditCell = (schedule) => (
    <div className={styles.editCell}>
      {editingId === schedule.id ? (
        <div className={styles.editActions}>
          <button 
            onClick={(e) => handleSaveEdit(schedule.id, e)}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={(e) => handleCancelEdit(e)}
            disabled={saving}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(schedule, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  // Render expanded row with details
  const renderExpandedRow = (schedule) => {
    const addedAt = formatDateTimeLocal(schedule.created_at);
    const updatedAt = schedule.updated_at ? formatDateTimeLocal(schedule.updated_at) : 'Never updated';
    const classDuration = calculateClassDuration(schedule.class_start, schedule.class_end);
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(schedule.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="7">
          <div 
            className={`${styles.scheduleCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.scheduleHeader}>
              Grade {schedule.grade_level} Schedule
            </div>
            <div className={styles.details}>
              <div>
                <div className={styles.scheduleInfo}>
                  <strong>Schedule Details</strong>
                </div>
                <div className={styles.scheduleInfo}>Class Duration: {formatDuration(classDuration)}</div>
                <div className={styles.scheduleInfo}>Late Policy: Students are considered late {formatDuration(schedule.grace_period_minutes || 15)} after class starts</div>
                <div className={styles.scheduleInfo}>Time: {formatTimeAMPM(schedule.class_start)} - {formatTimeAMPM(schedule.class_end)}</div>
              </div>
              
              <div>
                <div className={styles.scheduleInfo}>
                  <strong>Record Information</strong>
                </div>
                <div className={styles.scheduleInfo}>Added: {addedAt}</div>
                <div className={styles.scheduleInfo}>Last Updated: {updatedAt}</div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Loading state
  if (loading) return (
    <div className={styles.scheduleTableContainer}>
      <div className={styles.loading}>Loading grade schedules...</div>
    </div>
  );
  
  // Error state
  if (error) return (
    <div className={styles.scheduleTableContainer}>
      <div className={styles.error}>Error: {error}</div>
    </div>
  );

  // Get table info message
  const getTableInfoMessage = () => {
    const scheduleCount = filteredSchedules.length;
    const selectedCount = selectedSchedules.length;
    
    if (searchTerm) {
      return `Found ${scheduleCount} schedule/s matching "${searchTerm}"${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`;
    }
    
    return `Showing ${scheduleCount} grade schedule/s${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`;
  };

  return (
    <div className={styles.scheduleTableContainer} ref={tableRef}>
      {/* Table info */}
      <div className={styles.tableInfo}>
        <p>{getTableInfoMessage()}</p>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>
                <div className={styles.icon} onClick={handleSelectAll}>
                  <FontAwesomeIcon 
                    icon={allVisibleSelected ? fasCircle : farCircleRegular} 
                    style={{ 
                      cursor: 'pointer',
                      color: allVisibleSelected ? '#007bff' : '' 
                    }}
                  />
                </div>
              </th>
              <th>GRADE LEVEL</th>
              <th>CLASS START</th>
              <th>CLASS END</th>
              <th>GRACE PERIOD</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.noSchedule}>
                  {getTableInfoMessage()}
                </td>
              </tr>
            ) : (
              filteredSchedules.map((schedule, index) => {
                const isExpanded = isRowExpanded(schedule.id);
                const isEditing = editingId === schedule.id;
                const isSelected = selectedSchedules.includes(schedule.id);
                const rowColorClass = index % 2 === 0 ? styles.rowEven : styles.rowOdd;
                
                return (
                  <React.Fragment key={schedule.id}>
                    {/* MAIN ROW - Always visible */}
                    <tr 
                      className={`${styles.scheduleRow} ${rowColorClass} ${isEditing ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
                      onClick={() => toggleRow(schedule.id)}
                    >
                      <td>
                        <div className={styles.icon} onClick={(e) => handleScheduleSelect(schedule.id, e)}>
                          <FontAwesomeIcon 
                            icon={isSelected ? fasCircle : farCircleRegular} 
                            style={{ 
                              cursor: 'pointer', 
                              color: isSelected ? '#007bff' : '' 
                            }}
                          />
                        </div>
                      </td>
                      
                      <td>
                        {isEditing ? (
                          <select
                            value={editFormData.grade_level || ''}
                            onChange={(e) => updateEditField('grade_level', e.target.value)}
                            className={`${styles.editSelect} ${validationErrors.grade_level ? styles.errorInput : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Select Grade</option>
                            {grades.map(grade => (
                              <option key={grade.id} value={grade.grade_level}>
                                Grade {grade.grade_level}
                              </option>
                            ))}
                          </select>
                        ) : (
                          `Grade ${schedule.grade_level}`
                        )}
                      </td>
                      
                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            value={editFormData.class_start || ''}
                            onChange={(e) => updateEditField('class_start', e.target.value)}
                            className={`${styles.editInput} ${validationErrors.class_start ? styles.errorInput : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          formatTimeAMPM(schedule.class_start)
                        )}
                      </td>
                      
                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            value={editFormData.class_end || ''}
                            onChange={(e) => updateEditField('class_end', e.target.value)}
                            className={`${styles.editInput} ${validationErrors.class_end ? styles.errorInput : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          formatTimeAMPM(schedule.class_end)
                        )}
                      </td>
                      
                      <td>
                        {isEditing ? (
                          <div className={styles.graceInputContainer}>
                            <input
                              type="number"
                              min="0"
                              max="120"
                              step="5"
                              value={editFormData.grace_period_minutes || '15'}
                              onChange={(e) => updateEditField('grace_period_minutes', e.target.value)}
                              className={`${styles.editInput} ${styles.graceInput} ${validationErrors.grace_period_minutes ? styles.errorInput : ''}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={styles.graceUnit}>minutes</span>
                          </div>
                        ) : (
                          formatDuration(schedule.grace_period_minutes || 15)
                        )}
                      </td>
                      
                      <td>
                        {renderEditCell(schedule)}
                      </td>
                      
                      <td>
                        <div className={styles.icon}>
                          <FontAwesomeIcon 
                            icon={faTrashCan} 
                            className="action-button"
                            onClick={(e) => handleDeleteClick(schedule, e)}
                          />
                        </div>
                      </td>
                    </tr>
                    
                    {/* EXPANDED ROW - Only when expanded */}
                    {isExpanded && renderExpandedRow(schedule)}
                    
                    {/* ERROR ROW - Only when editing has errors */}
                    {isEditing && Object.keys(validationErrors).length > 0 && (
                      <tr className={styles.errorRow}>
                        <td colSpan="7" className={styles.errorMessages}>
                          {Object.values(validationErrors).map((error, idx) => (
                            <div key={idx} className={styles.errorMessage}>
                              {error}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DeleteEntityModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setSelectedSchedule(null);
          }
        }}
        entity={selectedSchedule}
        entityType="grade schedule"
        onConfirm={handleConfirmDelete}
        currentFilter={searchTerm}
      />
    </div>
  );
};

export default GradeSchedulesTable;