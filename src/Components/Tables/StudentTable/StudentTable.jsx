 import React, { useMemo, useState, useEffect } from 'react';
import { useStudents } from '../../Hooks/useEntities'; 
import { useEntityEdit } from '../../hooks/useEntityEdit'; 
import { useRowExpansion } from '../../hooks/useRowExpansion';
import { useStudentActions } from '../../Hooks/useEntityActions'; 
import { StudentService } from '../../../Utils/EntityService'; 
import { grades, shouldHandleRowClick } from '../../../Utils/tableHelpers';
import { sortStudents } from '../../../Utils/SortEntities'; 
import { compareSections } from '../../../Utils/CompareHelpers'; 
import { formatStudentName, formatGradeSection, formatDate, formatNA } from '../../../Utils/Formatters';
import Button from '../../UI/Buttons/Button/Button';
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';
import QRCodeModal from '../../Modals/QRCodeModal/QRCodeModal';
import QRCodeUpdateWarningModal from '../../Modals/QRCodeUpdateWarningModal/QRCodeUpdateWarningModal';
import styles from './StudentTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as farCircle } from "@fortawesome/free-regular-svg-icons";
import { faQrcode, faPenToSquare, faTrashCan, faCircle as fasCircle } from "@fortawesome/free-solid-svg-icons";
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider'; 
import { supabase } from '../../../lib/supabase';

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
  refreshAllStudents,
  onSectionSelect,
  availableSections = []
}) => {
    
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentClass, setCurrentClass] = useState('all');
  
  const { editingId: editingStudent, editFormData, saving, validationErrors, startEdit, cancelEdit, updateEditField, saveEdit } = useEntityEdit(
    students, 
    setStudents,
    'student',
    refreshAllStudents
  );
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { 
    qrModalOpen, setQrModalOpen, selectedStudent, 
    handleQRCodeClick 
  } = useStudentActions(setStudents);

  const { success } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const [updateWarningOpen, setUpdateWarningOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [sectionInputValue, setSectionInputValue] = useState('');
  const [sectionSuggestionsId] = useState(() => `sectionSuggestions_${Math.random().toString(36).substr(2, 9)}`);

  const studentService = useMemo(() => new StudentService(), []);

  // Fetch students with joins
  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);
        setError(null);
        
        let query = supabase
          .from('students')
          .select(`
            *,
            grade:grades(grade_level),
            section:sections(section_name, room:rooms(room_number))
          `);
        
        const { data, error } = await query;
        
        if (error) {
          setError(error.message);
        } else {
          // Transform the data to flatten grade and section
          const transformedData = (data || []).map(student => ({
            ...student,
            // Flatten grade to just the grade_level string
            grade: student.grade?.grade_level || student.grade,
            // Flatten section to just the section_name string
            section: student.section?.section_name || student.section
          }));
          
          setStudents(transformedData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudents();
  }, []);

  // Add real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('students-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'students' }, 
        () => {
          // Refetch students when changes occur
          supabase
            .from('students')
            .select(`
              *,
              grade:grades(grade_level),
              section:sections(section_name, room:rooms(room_number))
            `)
            .then(({ data, error }) => {
              if (!error) {
                setStudents(data || []);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const allUniqueSections = useMemo(() => {
    const sections = students
      .map(student => {
        // Handle both old string format and new object format
        if (typeof student.section === 'object' && student.section !== null) {
          return student.section.section_name || '';
        }
        return student.section?.toString() || '';
      })
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort(compareSections);
  }, [students]);

  const currentGradeSections = useMemo(() => {
    if (currentClass === 'all') {
      return allUniqueSections;
    }
    
    const sections = students
      .filter(student => {
        // Handle both old string format and new object format
        const studentGrade = typeof student.grade === 'object' && student.grade !== null 
          ? student.grade.grade_level 
          : student.grade?.toString();
        return studentGrade === currentClass;
      })
      .map(student => {
        if (typeof student.section === 'object' && student.section !== null) {
          return student.section.section_name || '';
        }
        return student.section?.toString() || '';
      })
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort(compareSections);
  }, [students, currentClass, allUniqueSections]);

  const sectionsToShowInDropdown = useMemo(() => {
    if (!selectedSection) {
      return currentGradeSections;
    } else {
      return allUniqueSections;
    }
  }, [selectedSection, currentGradeSections, allUniqueSections]);

  const filteredSectionSuggestions = useMemo(() => {
    if (!sectionInputValue) return allUniqueSections;
    
    const inputLower = sectionInputValue.toLowerCase();
    return allUniqueSections.filter(section => 
      section.toLowerCase().includes(inputLower)
    );
  }, [allUniqueSections, sectionInputValue]);

  useEffect(() => {
    if (onGradeUpdate) {
      onGradeUpdate(currentClass);
    }
  }, [currentClass, onGradeUpdate]);

  useEffect(() => {
    if (onSectionsUpdate) {
      onSectionsUpdate(allUniqueSections);
    }
  }, [allUniqueSections, onSectionsUpdate]);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    // Apply grade filter first
    if (currentClass !== 'all') {
      filtered = filtered.filter(student => {
        const studentGrade = typeof student.grade === 'object' && student.grade !== null 
          ? student.grade.grade_level 
          : student.grade?.toString();
        return studentGrade === currentClass;
      });
    }
      
    // Apply section filter second
    if (selectedSection) {
      filtered = filtered.filter(student => {
        const studentSection = typeof student.section === 'object' && student.section !== null
          ? student.section.section_name
          : student.section?.toString();
        return studentSection === selectedSection;
      });
    }
    
    // Apply search filter last
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => 
        student.lrn?.toLowerCase().includes(searchLower) ||
        student.first_name?.toLowerCase().includes(searchLower) ||
        student.middle_name?.toLowerCase().includes(searchLower) ||
        student.last_name?.toLowerCase().includes(searchLower) ||
        (typeof student.grade === 'object' ? student.grade.grade_level?.toLowerCase().includes(searchLower) : student.grade?.toString().toLowerCase().includes(searchLower)) ||
        (typeof student.section === 'object' ? student.section.section_name?.toLowerCase().includes(searchLower) : student.section?.toString().toLowerCase().includes(searchLower)) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.phone_number?.toLowerCase().includes(searchLower) ||
        student.guardian_first_name?.toLowerCase().includes(searchLower) ||
        student.guardian_last_name?.toLowerCase().includes(searchLower) ||
        student.guardian_phone_number?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [students, currentClass, selectedSection, searchTerm]);

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
    setCurrentClass(className);
    toggleRow(null); 
    cancelEdit(); 
    setSelectedStudents([]); 
    
    if (selectedSection && onSectionSelect) {
      onSectionSelect('');
    }
    
    if (selectedSection && onClearSectionFilter) {
      onClearSectionFilter();
    }
  };

  const handleSectionFilter = (section) => {
    if (onSectionSelect) {
      onSectionSelect(section);
    }
  };

  const handleRowClick = (studentId, e) => {
    if (shouldHandleRowClick(editingStudent, e.target)) {
      toggleRow(studentId);
    }
  };

  const handleEditClick = (student, e) => {
    e.stopPropagation();
    
    // Convert grade/section objects to strings for editing
    const studentForEdit = {
      ...student,
      grade: typeof student.grade === 'object' ? student.grade.grade_level : student.grade,
      section: typeof student.section === 'object' ? student.section.section_name : student.section
    };
    
    startEdit(studentForEdit);
    setSectionInputValue(studentForEdit.section || '');
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
    
    // Get original grade/section as strings for comparison
    const originalGrade = typeof student.grade === 'object' ? student.grade.grade_level : student.grade;
    const originalSection = typeof student.section === 'object' ? student.section.section_name : student.section;
    
    const criticalFieldsChanged = 
      editFormData.lrn !== student.lrn ||
      editFormData.first_name !== student.first_name ||
      editFormData.last_name !== student.last_name ||
      editFormData.grade !== originalGrade ||
      editFormData.section !== originalSection;

    if (criticalFieldsChanged) {
      setPendingUpdate({ studentId, student });
      setUpdateWarningOpen(true);
    } else {
      // Find grade_id and section_id for the updated values
      let gradeId = null;
      let sectionId = null;
      
      try {
        // Find grade_id
        if (editFormData.grade) {
          const { data: gradeData } = await supabase
            .from('grades')
            .select('id')
            .eq('grade_level', editFormData.grade.startsWith('Grade ') ? editFormData.grade : `Grade ${editFormData.grade}`)
            .single();
          
          if (gradeData) gradeId = gradeData.id;
        }
        
        // Find section_id (requires grade_id)
        if (editFormData.section && gradeId) {
          const { data: sectionData } = await supabase
            .from('sections')
            .select('id')
            .eq('grade_id', gradeId)
            .eq('section_name', editFormData.section)
            .single();
          
          if (sectionData) sectionId = sectionData.id;
        }
      } catch (error) {
        console.error('Error finding grade/section IDs:', error);
      }
      
      const result = await saveEdit(
        studentId, 
        currentClass, 
        async (id, data) => {
          const updateData = {
            ...data,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          };
          
          // Add grade_id and section_id if found
          if (gradeId) updateData.grade_id = gradeId;
          if (sectionId) updateData.section_id = sectionId;
          
          // Remove grade/section text fields if IDs are provided
          if (gradeId) delete updateData.grade;
          if (sectionId) delete updateData.section;
          
          return await studentService.update(id, updateData);
        }
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
      // Similar logic as handleSaveEdit but for critical updates
      const result = await saveEdit(
        pendingUpdate.studentId, 
        currentClass, 
        async (id, data) => {
          // Find grade_id and section_id
          let gradeId = null;
          let sectionId = null;
          
          if (editFormData.grade) {
            const { data: gradeData } = await supabase
              .from('grades')
              .select('id')
              .eq('grade_level', editFormData.grade.startsWith('Grade ') ? editFormData.grade : `Grade ${editFormData.grade}`)
              .single();
            
            if (gradeData) gradeId = gradeData.id;
          }
          
          if (editFormData.section && gradeId) {
            const { data: sectionData } = await supabase
              .from('sections')
              .select('id')
              .eq('grade_id', gradeId)
              .eq('section_name', editFormData.section)
              .single();
            
            if (sectionData) sectionId = sectionData.id;
          }
          
          const updateData = {
            ...data,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          };
          
          if (gradeId) updateData.grade_id = gradeId;
          if (sectionId) updateData.section_id = sectionId;
          
          // Remove text fields if IDs are provided
          if (gradeId) delete updateData.grade;
          if (sectionId) delete updateData.section;
          
          return await studentService.update(id, updateData);
        }
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
    
    // Display logic - now grade and section are already flattened strings
    // Email and phone are only shown in expanded row, not in main table
    if (fieldName === 'email' || fieldName === 'phone_number') {
      return ''; // Return empty string to hide from main table
    }
    
    if (fieldName.startsWith('guardian_')) {
      return formatNA(student[fieldName]);
    }
    
    return student[fieldName];
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
    const addedAt = formatDateTimeLocal(student.created_at);
    const updatedAt = student.updated_at ? formatDateTimeLocal(student.updated_at) : 'Never updated';
    
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

    // Get grade and section display values
    const gradeDisplay = typeof student.grade === 'object' && student.grade !== null 
      ? student.grade.grade_level 
      : student.grade;
    
    const sectionDisplay = typeof student.section === 'object' && student.section !== null
      ? student.section.section_name
      : student.section;

    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(student.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="10"> {/* Changed from 12 to 10 since we removed 2 columns */}
          <div 
            className={`${styles.studentCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.studentHeader}>
              {formatStudentName(student)}
            </div>
          
            <div className={styles.details}>
              <div>
                <div className={styles.studentInfo}>
                  <strong>Student Details</strong>
                </div>
                <div className={styles.studentInfo}>LRN: {student.lrn}</div>
                <div className={styles.studentInfo}>Grade & Section: {gradeDisplay} - {sectionDisplay}</div>
                <div className={styles.studentInfo}>Full Name: {formatStudentName(student)}</div>
                <div className={styles.studentInfo}>Email: {formatNA(student.email)}</div>
                <div className={styles.studentInfo}>Phone: {formatNA(student.phone_number)}</div>
              </div>

              <div>
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
              </div>
          
              <div>
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
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderRegularRow = (student, rowColorClass, visibleRowIndex, isSelected) => {
    return (
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
    );
  };

  const renderHiddenRow = (student, rowColorClass, isSelected) => {
    return (
      <tr 
        className={`${styles.studentRow} ${rowColorClass} ${editingStudent === student.id ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
        onClick={(e) => handleRowClick(student.id, e)}
        style={{ height: '0px', visibility: 'hidden', overflow: 'hidden' }}
      >
        <td style={{ height: '0px', padding: '0', border: 'none' }}>
          <div className={styles.icon} onClick={(e) => handleStudentSelect(student.id, e)}>
            <FontAwesomeIcon 
              icon={isSelected ? fasCircle : farCircle} 
              style={{ 
                cursor: 'pointer', 
                color: isSelected ? '#007bff' : '',
                visibility: 'hidden'
              }}
            />
          </div>
        </td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderField(student, 'lrn')}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderField(student, 'first_name')}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderField(student, 'middle_name')}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderField(student, 'last_name')}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderField(student, 'grade')}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderField(student, 'section')}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>
          <div className={styles.icon}>
            <FontAwesomeIcon 
              icon={faQrcode} 
              onClick={(e) => handleQRCodeClickWithEvent(student, e)} 
              className="action-button"
              style={{ cursor: 'pointer', visibility: 'hidden' }}
            />
          </div>
        </td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>{renderEditCell(student)}</td>
        <td style={{ height: '0px', padding: '0', border: 'none' }}>
          <div className={styles.icon}>
            <FontAwesomeIcon 
              icon={faTrashCan} 
              className="action-button"
              onClick={(e) => handleDeleteClickWithEvent(student, e)}
              style={{ visibility: 'hidden' }}
            />
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

  const getTableInfoMessage = () => {
    const studentCount = sortedStudents.length;
    const selectedCount = visibleSelectedStudents.length;
    
    let message = '';
    
    if (selectedSection) {
      message = `Showing ${studentCount} student/s in Section ${selectedSection}`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
      
      if (searchTerm) {
        message += ` matching "${searchTerm}"`;
      }
    } else if (searchTerm) {
      message = `Found ${studentCount} student/s matching "${searchTerm}"`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
    } else {
      if (currentClass === 'all') {
        message = `Showing ${studentCount} student/s across all grades`;
      } else {
        message = `Showing ${studentCount} student/s in Grade ${currentClass}`;
      }
    }
    
    if (selectedCount > 0) {
      message += ` (${selectedCount} selected)`;
    }
    
    return message;
  };

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
            <p>{getTableInfoMessage()}</p>
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
                      style={{ cursor: 'pointer',
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
                <th>QR CODE</th>
                <th>EDIT</th>
                <th>DELETE</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan="10" className={styles.noStudents}> {/* Changed from 12 to 10 */}
                    {getTableInfoMessage()}
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

                  if (isRowExpanded(student.id)) {
                    return (
                      <React.Fragment key={student.id}>
                        {renderHiddenRow(student, rowColorClass, isSelected)}
                        {renderExpandedRow(student)}
                      </React.Fragment>
                    );
                  } else {
                    return renderRegularRow(student, rowColorClass, visibleRowIndex, isSelected);
                  }
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