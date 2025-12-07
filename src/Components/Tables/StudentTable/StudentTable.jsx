import React, { useMemo, useState, useEffect } from 'react';
import { useStudents } from '../../Hooks/useEntities'; 
import { useEntityEdit } from '../../Hooks/useEntityEdit'; 
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { useStudentActions } from '../../Hooks/useEntityActions'; 
import { StudentService } from '../../../Utils/EntityService'; 
import { grades, shouldHandleRowClick } from '../../../Utils/tableHelpers';
import { sortStudents } from '../../../Utils/SortEntities'; 
import { compareSections } from '../../../Utils/CompareHelpers'; 
import { formatStudentName, formatGradeSection, formatDate, formatNA } from '../../../Utils/Formatters';
import Button from '../../UI/Buttons/Button/Button';
import QRCodeModal from '../../Modals/QRCodeModal/QRCodeModal';
import QRCodeUpdateWarningModal from '../../Modals/QRCodeUpdateWarningModal/QRCodeUpdateWarningModal';
import styles from './StudentTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as farCircle } from "@fortawesome/free-regular-svg-icons";
import { faQrcode, faPenToSquare, faTrashCan, faCircle as fasCircle } from "@fortawesome/free-solid-svg-icons";
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider'; 

// Update this helper function to use proper formatting
const formatDateTimeLocal = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
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

const StudentTable = ({ 
  searchTerm = '', 
  selectedSection = '', 
  onSectionsUpdate, 
  onSelectedStudentsUpdate,
  onStudentDataUpdate,
  onGradeUpdate,
  onClearSectionFilter,
  onSingleDeleteClick,
  refreshStudents,
  refreshAllStudents
}) => {
    
  const { currentClass, entities: students, loading, error, changeClass, setEntities } = useStudents();
  
  const { editingId: editingStudent, editFormData, saving, validationErrors, startEdit, cancelEdit, updateEditField, saveEdit } = useEntityEdit(
    students, 
    setEntities,
    'student',
    refreshAllStudents
  );
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { 
    qrModalOpen, setQrModalOpen, selectedStudent, 
    handleQRCodeClick 
  } = useStudentActions(setEntities);

  const { success } = useToast();
  const { user, profile, loading: authLoading } = useAuth(); // Use existing auth hook
  const [updateWarningOpen, setUpdateWarningOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [sectionInputValue, setSectionInputValue] = useState('');
  const [sectionSuggestionsId] = useState(() => `sectionSuggestions_${Math.random().toString(36).substr(2, 9)}`);

  // Create service instance
  const studentService = useMemo(() => new StudentService(), []);

  // Get all unique sections from all students for datalist suggestions
  const allUniqueSections = useMemo(() => {
    const sections = students
      .map(student => student.section?.toString())
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort(compareSections);
  }, [students]);

  // Get filtered sections based on current input
  const filteredSectionSuggestions = useMemo(() => {
    if (!sectionInputValue) return allUniqueSections;
    
    const inputLower = sectionInputValue.toLowerCase();
    return allUniqueSections.filter(section => 
      section.toLowerCase().includes(inputLower)
    );
  }, [allUniqueSections, sectionInputValue]);

  // Get sections for current grade only (or all if 'all' is selected)
  const availableSections = useMemo(() => {
    if (currentClass === 'all') {
      return allUniqueSections;
    }
    
    const sections = students
      .filter(student => student.grade?.toString() === currentClass)
      .map(student => student.section?.toString())
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort(compareSections);
  }, [students, currentClass, allUniqueSections]);

  useEffect(() => {
    if (onGradeUpdate) {
      onGradeUpdate(currentClass);
    }
  }, [currentClass, onGradeUpdate]);

  useEffect(() => {
    if (onSectionsUpdate) {
      onSectionsUpdate(availableSections);
    }
  }, [availableSections, onSectionsUpdate]);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    if (selectedSection) {
      filtered = filtered.filter(student => 
        student.section?.toString() === selectedSection
      );
    }
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => 
        student.lrn?.toLowerCase().includes(searchLower) ||
        student.first_name?.toLowerCase().includes(searchLower) ||
        student.middle_name?.toLowerCase().includes(searchLower) ||
        student.last_name?.toLowerCase().includes(searchLower) ||
        student.grade?.toString().toLowerCase().includes(searchLower) ||
        student.section?.toString().toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.phone_number?.toLowerCase().includes(searchLower) ||
        student.guardian_first_name?.toLowerCase().includes(searchLower) ||
        student.guardian_last_name?.toLowerCase().includes(searchLower) ||
        student.guardian_phone_number?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [students, searchTerm, selectedSection]);

  const sortedStudents = useMemo(() => sortStudents(filteredStudents), [filteredStudents]);

  const visibleSelectedStudents = useMemo(() => {
    const visibleStudentIds = new Set(sortedStudents.map(student => student.id));
    return selectedStudents.filter(id => visibleStudentIds.has(id));
  }, [selectedStudents, sortedStudents]);

  useEffect(() => {
    if (onSelectedStudentsUpdate) {
      onSelectedStudentsUpdate(visibleSelectedStudents);
    }
  }, [visibleSelectedStudents, onSelectedStudentsUpdate]);
  
  useEffect(() => {
    if (onStudentDataUpdate) {
      onStudentDataUpdate(students);
    }
  }, [students, onStudentDataUpdate]);

  const handleClassChange = (className) => {
    changeClass(className);
    toggleRow(null); 
    cancelEdit(); 
    setSelectedStudents([]); 
    
    if (selectedSection && onClearSectionFilter) {
      onClearSectionFilter();
    }
  };

  const handleRowClick = (studentId, e) => {
    if (shouldHandleRowClick(editingStudent, e.target)) {
      toggleRow(studentId);
    }
  };

  const handleEditClick = (student, e) => {
    e.stopPropagation();
    startEdit(student);
    setSectionInputValue(student.section || '');
    toggleRow(null); 
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateEditField(name, value);
    
    if (name === 'section') {
      setSectionInputValue(value);
    }
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    updateEditField(name, value);
  };

  const handleSaveEdit = async (studentId, e) => {
    if (e) e.stopPropagation();
    
    const student = students.find(s => s.id === studentId);
    const criticalFieldsChanged = 
      editFormData.lrn !== student.lrn ||
      editFormData.first_name !== student.first_name ||
      editFormData.last_name !== student.last_name ||
      editFormData.grade !== student.grade ||
      editFormData.section !== student.section;

    if (criticalFieldsChanged) {
      setPendingUpdate({ studentId, student });
      setUpdateWarningOpen(true);
    } else {
      const result = await saveEdit(
        studentId, 
        currentClass, 
        (id, data) => studentService.update(id, {
          ...data,
          updated_by: user?.id, // Use user.id from auth
          updated_at: new Date().toISOString()
        })
      );
      
      if (result.success) {
        success('Student information updated successfully');
        if (result.gradeChanged) {
          success(`Student moved to Grade ${editFormData.grade}`);
        }
        if (refreshStudents) {
          refreshStudents();
        }
      } else {
        console.error(result.error);
      }
    }
    setSectionInputValue('');
  };

  const handleConfirmUpdate = async () => {
    if (pendingUpdate) {
      const result = await saveEdit(
        pendingUpdate.studentId, 
        currentClass, 
        (id, data) => studentService.update(id, {
          ...data,
          updated_by: user?.id, // Use user.id from auth
          updated_at: new Date().toISOString()
        })
      );
      
      if (result.success) {
        success('Student information updated successfully');
        if (result.gradeChanged) {
          success(`Student moved to Grade ${editFormData.grade}`);
        }
        if (refreshStudents) {
          refreshStudents();
        }
      } else {
        console.error(result.error);
      }
      setPendingUpdate(null);
      setSectionInputValue('');
    }
  };

  const handleInputClick = (e) => {
    e.stopPropagation();
  };

  const handleQRCodeClickWithEvent = async (student, e) => {
    e.stopPropagation();
    await handleQRCodeClick(student);
  };

  const handleDeleteClickWithEvent = (student, e) => {
    e.stopPropagation();
    if (onSingleDeleteClick) {
      onSingleDeleteClick(student);
    }
  };

  const handleStudentSelect = (studentId, e) => {
    e.stopPropagation();
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    const allVisibleStudentIds = sortedStudents.map(student => student.id);
    
    if (allVisibleStudentIds.every(id => selectedStudents.includes(id))) {
      setSelectedStudents(prev => prev.filter(id => !allVisibleStudentIds.includes(id)));
    } else {
      setSelectedStudents(prev => {
        const newSelection = new Set([...prev, ...allVisibleStudentIds]);
        return Array.from(newSelection);
      });
    }
  };

  const allVisibleSelected = sortedStudents.length > 0 && 
    sortedStudents.every(student => selectedStudents.includes(student.id));

  const renderEditInput = (fieldName, type = 'text') => (
    <input
      type={type}
      name={fieldName}
      value={editFormData[fieldName] || ''}
      onChange={handleInputChange}
      onClick={handleInputClick}
      className={`${styles.editInput} ${validationErrors[fieldName] ? styles.errorInput : ''} edit-input`}
    />
  );

  const renderGuardianEditInput = (fieldName, type = 'text') => (
    <input
      type={type}
      name={fieldName}
      value={editFormData[fieldName] || ''}
      onChange={handleInputChange}
      onClick={handleInputClick}
      className={`${styles.editInput} ${validationErrors[fieldName] ? styles.errorInput : ''} edit-input`}
      placeholder={`Guardian ${fieldName.replace('guardian_', '').replace('_', ' ')}`}
    />
  );

  const renderGradeDropdown = () => (
    <select
      name="grade"
      value={editFormData.grade || ''}
      onChange={handleSelectChange}
      onClick={handleInputClick}
      className={`${styles.editSelect} ${validationErrors.grade ? styles.errorInput : ''} edit-input`}
    >
      {grades.map(grade => (
        <option key={grade} value={grade}>
          {grade}
        </option>
      ))}
    </select>
  );

  const renderSectionInput = () => (
    <>
      <input
        type="text"
        name="section"
        list={sectionSuggestionsId}
        value={editFormData.section || ''}
        onChange={handleInputChange}
        onClick={handleInputClick}
        className={`${styles.editInput} ${validationErrors.section ? styles.errorInput : ''} edit-input`}
        placeholder="Enter section"
        autoComplete="off"
      />
      <datalist id={sectionSuggestionsId}>
        {filteredSectionSuggestions.map(section => (
          <option key={section} value={section} />
        ))}
      </datalist>
    </>
  );

  const renderField = (student, fieldName, isEditable = true) => {
    if (editingStudent === student.id && isEditable) {
      if (fieldName === 'grade') {
        return renderGradeDropdown();
      } else if (fieldName === 'section') {
        return renderSectionInput();
      } else if (fieldName.startsWith('guardian_')) {
        return renderGuardianEditInput(fieldName, fieldName.includes('email') ? 'email' : 'text');
      }
      return renderEditInput(fieldName, fieldName === 'email' ? 'email' : 'text');
    }
    return fieldName === 'email' || fieldName === 'phone_number' || fieldName.startsWith('guardian_')
      ? formatNA(student[fieldName])
      : student[fieldName];
  };

  const renderActionButtons = (student) => (
    <div className={`${styles.editActions} action-button`}>
      <button 
        onClick={(e) => handleSaveEdit(student.id, e)}
        disabled={saving}
        className={styles.saveBtn}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button 
        onClick={() => {
          cancelEdit();
          setSectionInputValue('');
        }}
        disabled={saving}
        className={styles.cancelBtn}
      >
        Cancel
      </button>
    </div>
  );

  const renderEditCell = (student) => (
    <div className={styles.editCell}>
      {editingStudent === student.id ? (
        renderActionButtons(student)
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(student, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

 const renderExpandedRow = (student) => {
  console.log('Student debug:', {
    id: student.id,
    name: formatStudentName(student),
    created_by: student.created_by,
    updated_by: student.updated_by,
    updated_by_user: student.updated_by_user,
    created_at: student.created_at,
    updated_at: student.updated_at
  });
  
  // Format creation and update timestamps using the local helper
  const addedAt = formatDateTimeLocal(student.created_at);
  const updatedAt = student.updated_at ? formatDateTimeLocal(student.updated_at) : 'Never updated';
  
  // Get current user for comparison
  const getCurrentUserName = () => {
    if (!user) return 'N/A';
    if (profile) {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      return name || profile.username || profile.email || 'Current User';
    }
    return user.email || 'Current User';
  };
  
  const currentUserName = getCurrentUserName();
  const currentUserId = user?.id;
    
  const updatedByName = student.updated_by 
    ? (student.updated_by_user 
        ? `${student.updated_by_user.first_name || ''} ${student.updated_by_user.last_name || ''}`.trim() || 
          student.updated_by_user.username || 
          student.updated_by_user.email || 
          'User'
        : (currentUserId && student.updated_by === currentUserId ? currentUserName : 'User')
      )
    : 'Not yet updated';

  return (
    <tr className={`${styles.expandRow} ${isRowExpanded(student.id) ? styles.expandRowActive : ''}`}>
      <td colSpan="12">
        <div 
          className={`${styles.studentCard} ${styles.expandableCard}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.studentHeader}>
            {formatStudentName(student)}
          </div>
          
          <div className={styles.studentInfo}>
            <strong>Student Details</strong>
          </div>
          <div className={styles.studentInfo}>LRN: {student.lrn}</div>
          <div className={styles.studentInfo}>Grade & Section: {formatGradeSection(student)}</div>
          <div className={styles.studentInfo}>Full Name: {formatStudentName(student)}</div>
          <div className={styles.studentInfo}>Email: {formatNA(student.email)}</div>
          <div className={styles.studentInfo}>Phone: {formatNA(student.phone_number)}</div>
          
          <div className={styles.studentInfo}>
            <strong>Guardian Information</strong>
          </div>
          <div className={styles.studentInfo}>
            Name: {formatNA(student.guardian_first_name)} {(student.guardian_middle_name)} {formatNA(student.guardian_last_name)}
          </div>
          <div className={styles.studentInfo}>
            Phone: {formatNA(student.guardian_phone_number)}
          </div>
          <div className={styles.studentInfo}>
            Email: {formatNA(student.guardian_email)}
          </div>
          
          <div className={styles.studentInfo}>
            <strong>Record Information</strong>
          </div>
          <div className={styles.studentInfo}>
            Added: {addedAt}
          </div>
          <div className={styles.studentInfo}>
            Last Updated: {updatedAt}
          </div>
          <div className={styles.studentInfo}>
            Last Updated By: {updatedByName}
            {student.updated_by && student.updated_by_user && (
              <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                ({student.updated_by_user.username || student.updated_by_user.email})
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

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
    <div className={styles.studentTableContainer} ref={tableRef}>
      <div className={styles.studentsTable}>
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
              {selectedSection 
                ? `Showing ${sortedStudents.length} student/s in Section ${selectedSection}${searchTerm ? ` matching "${searchTerm}"` : ''}`
                : searchTerm 
                  ? `Found ${sortedStudents.length} student/s matching "${searchTerm}" ${currentClass === 'all' ? 'across all grades' : `in Grade ${currentClass}`}`
                  : currentClass === 'all'
                    ? `Showing ${sortedStudents.length} student/s across all grades`
                    : `Showing ${sortedStudents.length} student/s in Grade ${currentClass}`
              }
              {visibleSelectedStudents.length > 0 && ` (${visibleSelectedStudents.length} selected)`}
            </p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.studentsTable}>
            <thead>
              <tr>
                <th>
                  <div className={styles.icon} onClick={handleSelectAll}>
                    <FontAwesomeIcon 
                      icon={allVisibleSelected ? fasCircle : farCircle} 
                      style={{ cursor: 'pointer' ,
                        color: allVisibleSelected ? '#007bff' : '' 
                      }}
                    />
                  </div>
                </th>
                <th>LRN</th>
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
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan="12" className={styles.noStudents}>
                    {searchTerm 
                      ? `No students found matching "${searchTerm}" ${currentClass === 'all' ? 'across all grades' : `in Grade ${currentClass}`}`
                      : currentClass === 'all'
                        ? 'No students found across all grades'
                        : `No students found in Grade ${currentClass}`
                    }
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => {
                  
                  const visibleRowIndex = sortedStudents
                    .slice(0, index)
                    .filter(s => !isRowExpanded(s.id))
                    .length;
                  
                  const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;
                  const isSelected = selectedStudents.includes(student.id);

                  return (
                    <React.Fragment key={student.id}>
                      {!isRowExpanded(student.id) && (
                        <tr 
                          className={`${styles.studentRow} ${rowColorClass} ${editingStudent === student.id ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
                          onClick={(e) => handleRowClick(student.id, e)}
                        >
                          <td>
                            <div className={styles.icon} onClick={(e) => handleStudentSelect(student.id, e)}>
                              <FontAwesomeIcon 
                                icon={isSelected ? fasCircle : farCircle} 
                                style={{ 
                                  cursor: 'pointer', 
                                  color: isSelected ? '#007bff' : '' 
                                }}
                              />
                            </div>
                          </td>
                          <td>{renderField(student, 'lrn')}</td>
                          <td>{renderField(student, 'first_name')}</td>
                          <td>{renderField(student, 'middle_name')}</td>
                          <td>{renderField(student, 'last_name')}</td>
                          <td>{renderField(student, 'grade')}</td>
                          <td>{renderField(student, 'section')}</td>
                          <td>{renderField(student, 'email')}</td>
                          <td>{renderField(student, 'phone_number')}</td>
                          <td>
                            <div className={styles.icon}>
                              <FontAwesomeIcon 
                                icon={faQrcode} 
                                onClick={(e) => handleQRCodeClickWithEvent(student, e)} 
                                className="action-button"
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                          </td>
                          <td>{renderEditCell(student)}</td>
                          <td>
                            <div className={styles.icon}>
                              <FontAwesomeIcon 
                                icon={faTrashCan} 
                                className="action-button"
                                onClick={(e) => handleDeleteClickWithEvent(student, e)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                      {renderExpandedRow(student)}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        student={selectedStudent}
      />

      <QRCodeUpdateWarningModal
        isOpen={updateWarningOpen}
        onClose={() => {
          setUpdateWarningOpen(false);
          setPendingUpdate(null);
        }}
        student={pendingUpdate?.student}
        onConfirm={handleConfirmUpdate}
      />
    </div>
  );
};

export default StudentTable;