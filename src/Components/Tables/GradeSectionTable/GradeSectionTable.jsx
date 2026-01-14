import React, { useState, useEffect } from 'react';
import styles from './GradeSectionTable.module.css';
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
import { compareSections } from '../../../Utils/CompareHelpers';

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

// Sorting function for grade sections (numerical grade sorting)
const sortGradeSections = (sections) => {
  return [...sections].sort((a, b) => {
    const gradeA = parseInt(a.grade) || 0;
    const gradeB = parseInt(b.grade) || 0;
    
    if (gradeA !== gradeB) {
      return gradeA - gradeB;
    }
    
    const sectionComparison = compareSections(a.section || '', b.section || '');
    if (sectionComparison !== 0) {
      return sectionComparison;
    }
    
    return (a.room || '').localeCompare(b.room || '');
  });
};

const GradeSectionTable = ({ 
  searchTerm = '',
  onSelectedGradeSectionsUpdate,
  selectedGradeSections = [],
  onSingleDeleteClick
}) => {
  const [gradeSections, setGradeSections] = useState([]);
  const [grades, setGrades] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGradeSection, setSelectedGradeSection] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { expandedRow, toggleRow, isRowExpanded, tableRef } = useRowExpansion();
  const { success, error: toastError } = useToast();
  
  const sectionService = new EntityService('sections');
  const gradeService = new EntityService('grades');
  const roomService = new EntityService('rooms');

  // Fetch function for grade sections
  const fetchGradeSections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all grades and rooms for dropdowns
      const { data: allGrades, error: gradesError } = await supabase
        .from('grades')
        .select('id, grade_level')
        .order('grade_level');
      
      if (gradesError) throw gradesError;
      
      const { data: allRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, room_number')
        .order('room_number');
      
      if (roomsError) throw roomsError;
      
      // Fetch sections with related data
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          grade:grades!grade_id (
            grade_level
          ),
          room:rooms!room_id (
            room_number
          )
        `);
      
      if (error) throw error;
      
      setGrades(allGrades || []);
      setRooms(allRooms || []);
      
      // Transform data to flatten structure
      const transformedData = (data || []).map(item => ({
        id: item.id,
        grade: item.grade?.grade_level || 'N/A',
        section: item.section_name || 'N/A',
        room: item.room?.room_number || 'N/A',
        created_at: item.created_at,
        updated_at: item.updated_at,
        grade_id: item.grade_id,
        room_id: item.room_id
      }));
      
      // Sort the data numerically by grade
      const sortedData = sortGradeSections(transformedData);
      
      setGradeSections(sortedData);
      
    } catch (err) {
      console.error('Error fetching grade sections:', err);
      setError(err.message);
      setGradeSections([]);
      setGrades([]);
      setRooms([]);
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
  } = useEntityEdit(gradeSections, setGradeSections, 'gradeSection', fetchGradeSections);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchGradeSections();
    
    const subscription = supabase
      .channel('grade-sections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sections'
        },
        () => {
          fetchGradeSections();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter and sort grade sections based on search term
  const filteredGradeSections = sortGradeSections(
    gradeSections.filter(section => {
      const searchLower = searchTerm.toLowerCase();
      const grade = section.grade?.toString() || '';
      const sectionName = section.section?.toString() || '';
      const room = section.room?.toString() || '';
      
      return (
        grade.toLowerCase().includes(searchLower) ||
        sectionName.toLowerCase().includes(searchLower) ||
        room.toLowerCase().includes(searchLower)
      );
    })
  );

  // Handle individual grade section selection
  const handleGradeSectionSelect = (gradeSectionId, e) => {
    e.stopPropagation();
    const newSelected = selectedGradeSections.includes(gradeSectionId)
      ? selectedGradeSections.filter(id => id !== gradeSectionId)
      : [...selectedGradeSections, gradeSectionId];
    
    if (onSelectedGradeSectionsUpdate) {
      onSelectedGradeSectionsUpdate(newSelected);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const allVisibleIds = filteredGradeSections.map(gs => gs.id);
    const allSelected = allVisibleIds.every(id => selectedGradeSections.includes(id));
    
    const newSelected = allSelected
      ? selectedGradeSections.filter(id => !allVisibleIds.includes(id))
      : [...new Set([...selectedGradeSections, ...allVisibleIds])];
    
    if (onSelectedGradeSectionsUpdate) {
      onSelectedGradeSectionsUpdate(newSelected);
    }
  };

  const allVisibleSelected = filteredGradeSections.length > 0 && 
    filteredGradeSections.every(gs => selectedGradeSections.includes(gs.id));

  // Delete handler
  const handleDeleteClick = (gradeSection, e) => {
    e.stopPropagation();
    if (onSingleDeleteClick) {
      onSingleDeleteClick(gradeSection, 'gradeSection');
    } else {
      setSelectedGradeSection(gradeSection);
      setIsDeleteModalOpen(true);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async (id) => {
    setIsDeleting(true);
    try {
      await sectionService.delete(id);
      success('Grade section deleted successfully');
      fetchGradeSections();
      // Remove from selected if it was selected
      const newSelected = selectedGradeSections.filter(selectedId => selectedId !== id);
      if (onSelectedGradeSectionsUpdate) {
        onSelectedGradeSectionsUpdate(newSelected);
      }
    } catch (err) {
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSelectedGradeSection(null);
    }
  };

  // Edit handlers
  const handleEditClick = (gradeSection, e) => {
    e.stopPropagation();
    startEdit(gradeSection);
  };

  const handleSaveEdit = async (id, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(id, null, async (id, data) => {
      // Get grade ID and room ID from selected values
      const selectedGrade = grades.find(g => g.grade_level === data.grade);
      const selectedRoom = rooms.find(r => r.room_number === data.room);
      
      if (!selectedGrade) {
        throw new Error('Selected grade not found');
      }
      
      if (!selectedRoom) {
        throw new Error('Selected room not found');
      }
      
      return await sectionService.update(id, {
        grade_id: selectedGrade.id,
        section_name: data.section,
        room_id: selectedRoom.id
      });
    });

    if (result.success) {
      success('Grade section updated successfully');
    }
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    cancelEdit();
  };

  // Render edit cell
  const renderEditCell = (gradeSection) => (
    <div className={styles.editCell}>
      {editingId === gradeSection.id ? (
        <div className={styles.editActions}>
          <button 
            onClick={(e) => handleSaveEdit(gradeSection.id, e)}
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
            onClick={(e) => handleEditClick(gradeSection, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  // Render expanded row with details
  const renderExpandedRow = (gradeSection) => {
    const addedAt = formatDateTimeLocal(gradeSection.created_at);
    const updatedAt = gradeSection.updated_at ? formatDateTimeLocal(gradeSection.updated_at) : 'Never updated';
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(gradeSection.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="6">
          <div 
            className={`${styles.gradeSectionCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.gradeSectionHeader}>
              Grade {gradeSection.grade} - Section {gradeSection.section}
            </div>
            <div className={styles.details}>
              <div>
                <div className={styles.gradeSectionInfo}>
                  <strong>Grade Section Details</strong>
                </div>
                <div className={styles.gradeSectionInfo}>Grade Level: {gradeSection.grade}</div>
                <div className={styles.gradeSectionInfo}>Section: {gradeSection.section}</div>
                <div className={styles.gradeSectionInfo}>Room: {gradeSection.room}</div>
              </div>
              
              <div>
                <div className={styles.gradeSectionInfo}>
                  <strong>Record Information</strong>
                </div>
                <div className={styles.gradeSectionInfo}>Added: {addedAt}</div>
                <div className={styles.gradeSectionInfo}>Last Updated: {updatedAt}</div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Loading state
  if (loading) return (
    <div className={styles.gradeSectionTableContainer}>
      <div className={styles.loading}>Loading grade sections...</div>
    </div>
  );
  
  // Error state
  if (error) return (
    <div className={styles.gradeSectionTableContainer}>
      <div className={styles.error}>Error: {error}</div>
    </div>
  );

  // Get table info message
  const getTableInfoMessage = () => {
    const sectionCount = filteredGradeSections.length;
    const selectedCount = selectedGradeSections.length;
    
    if (searchTerm) {
      return `Found ${sectionCount} grade section/s matching "${searchTerm}"${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`;
    }
    
    return `Showing ${sectionCount} grade section/s${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`;
  };

  return (
    <div className={styles.gradeSectionTableContainer} ref={tableRef}>
      {/* Table info similar to GradeSchedulesTable */}
      <div className={styles.tableInfo}>
        <p>{getTableInfoMessage()}</p>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.gradeSectionsTable}>
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
              <th>SECTION</th>
              <th>ROOM</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {filteredGradeSections.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.noGradeSection}>
                  {getTableInfoMessage()}
                </td>
              </tr>
            ) : (
              filteredGradeSections.map((gradeSection, index) => {
                const isExpanded = isRowExpanded(gradeSection.id);
                const isEditing = editingId === gradeSection.id;
                const isSelected = selectedGradeSections.includes(gradeSection.id);
                const rowColorClass = index % 2 === 0 ? styles.rowEven : styles.rowOdd;
                
                return (
                  <React.Fragment key={gradeSection.id}>
                    {!isExpanded && (
                      <tr 
                        className={`${styles.gradeSectionRow} ${rowColorClass} ${isEditing ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
                        onClick={() => toggleRow(gradeSection.id)}
                      >
                        <td>
                          <div className={styles.icon} onClick={(e) => handleGradeSectionSelect(gradeSection.id, e)}>
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
                              value={editFormData.grade || ''}
                              onChange={(e) => updateEditField('grade', e.target.value)}
                              className={`${styles.editSelect} ${validationErrors.grade ? styles.errorInput : ''}`}
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
                            `Grade ${gradeSection.grade}`
                          )}
                        </td>
                        
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.section || ''}
                              onChange={(e) => updateEditField('section', e.target.value)}
                              className={`${styles.editInput} ${validationErrors.section ? styles.errorInput : ''}`}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Section name"
                            />
                          ) : (
                            gradeSection.section
                          )}
                        </td>
                        
                        <td>
                          {isEditing ? (
                            <select
                              value={editFormData.room || ''}
                              onChange={(e) => updateEditField('room', e.target.value)}
                              className={`${styles.editSelect} ${validationErrors.room ? styles.errorInput : ''}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">Select Room</option>
                              {rooms.map(room => (
                                <option key={room.id} value={room.room_number}>
                                  Room {room.room_number}
                                </option>
                              ))}
                            </select>
                          ) : (
                            gradeSection.room
                          )}
                        </td>
                        
                        <td>
                          {renderEditCell(gradeSection)}
                        </td>
                        
                        <td>
                          <div className={styles.icon}>
                            <FontAwesomeIcon 
                              icon={faTrashCan} 
                              className="action-button"
                              onClick={(e) => handleDeleteClick(gradeSection, e)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    {renderExpandedRow(gradeSection)}
                    
                    {isEditing && Object.keys(validationErrors).length > 0 && (
                      <tr className={styles.errorRow}>
                        <td colSpan="6" className={styles.errorMessages}>
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
            setSelectedGradeSection(null);
          }
        }}
        entity={selectedGradeSection}
        entityType="grade section"
        onConfirm={handleConfirmDelete}
        currentFilter={searchTerm}
      />
    </div>
  );
};

export default GradeSectionTable;