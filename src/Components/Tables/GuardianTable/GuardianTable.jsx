import React, { useState, useEffect, useMemo } from 'react';
import { useEntityEdit } from '../../Hooks/useEntityEdit';
import { useRowExpansion } from '../../hooks/useRowExpansion';
import { grades } from '../../../Utils/tableHelpers';
import { formatNA } from '../../../Utils/Formatters';
import { sortGuardians } from '../../../Utils/SortEntities'; 
import Button from '../../UI/Buttons/Button/Button';
import Input from '../../UI/Input/Input';
import styles from './GuardianTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { supabase } from '../../../lib/supabase'; 
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';

const GuardianTable = () => {
  const [guardians, setGuardians] = useState([]);
  const [filteredGuardians, setFilteredGuardians] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('all');
  const [currentSection, setCurrentSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { 
    editingId, 
    editFormData, 
    saving, 
    validationErrors,
    startEdit, 
    cancelEdit, 
    updateEditField, 
    saveEdit 
  } = useEntityEdit(filteredGuardians, setFilteredGuardians, 'guardian');
  const [localGuardians, setLocalGuardians] = useState([]);

  // Fetch guardians from students table with proper joins
  const fetchGuardians = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('students')
        .select(`
          id,
          guardian_first_name,
          guardian_middle_name,
          guardian_last_name,
          guardian_email,
          guardian_phone_number,
          first_name,
          last_name,
          middle_name,
          lrn,
          grade:grades(grade_level),
          section:sections(section_name)
        `)
        .not('guardian_first_name', 'is', null)
        .not('guardian_last_name', 'is', null);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data to guardian format
      const transformedData = (data || []).map(student => ({
        id: student.id,
        first_name: student.guardian_first_name,
        middle_name: student.guardian_middle_name,
        last_name: student.guardian_last_name,
        email: student.guardian_email,
        phone_number: student.guardian_phone_number,
        // Student information
        guardian_of: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
        student_lrn: student.lrn,
        // Flatten grade and section
        grade: student.grade?.grade_level || 'N/A',
        section: student.section?.section_name || 'N/A',
        // For filtering
        full_name: `${student.guardian_first_name} ${student.guardian_middle_name || ''} ${student.guardian_last_name}`.trim().toLowerCase(),
        student_full_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim().toLowerCase()
      })).filter(guardian => guardian.first_name && guardian.last_name);
      
      setGuardians(transformedData);
      
    } catch (err) {
      console.error('Error fetching guardians:', err);
      setError(err.message);
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchGuardians();
    
    // Subscribe to student changes (since guardians are in students table)
    const subscription = supabase
      .channel('guardians-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        () => {
          fetchGuardians();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync and sort local state with fetched guardians
  useEffect(() => {
    if (guardians && guardians.length > 0) {
      const sortedGuardians = sortGuardians(guardians);
      setLocalGuardians(sortedGuardians);
    } else {
      setLocalGuardians([]);
    }
  }, [guardians]);

  // Apply filters and search
  useEffect(() => {
    if (!localGuardians || localGuardians.length === 0) {
      setFilteredGuardians([]);
      return;
    }

    let result = [...localGuardians];

    // Apply grade filter
    if (currentGrade !== 'all') {
      result = result.filter(guardian => guardian.grade === currentGrade);
    }

    // Apply section filter
    if (currentSection) {
      result = result.filter(guardian => guardian.section === currentSection);
    }

    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(guardian => 
        guardian.full_name.includes(query) ||
        guardian.email?.toLowerCase().includes(query) ||
        guardian.phone_number?.includes(query) ||
        guardian.guardian_of.toLowerCase().includes(query) ||
        guardian.student_lrn?.toLowerCase().includes(query)
      );
    }

    setFilteredGuardians(result);
  }, [localGuardians, currentGrade, currentSection, searchQuery]);

  // Get unique sections for the current grade
  const availableSections = useMemo(() => {
    if (!localGuardians || localGuardians.length === 0) return [];
    
    let guardiansToFilter = [...localGuardians];
    
    if (currentGrade !== 'all') {
      guardiansToFilter = guardiansToFilter.filter(g => g.grade === currentGrade);
    }
    
    const sections = guardiansToFilter
      .map(g => g.section)
      .filter(section => section && section !== 'N/A');
    
    return [...new Set(sections)].sort();
  }, [localGuardians, currentGrade]);

  const handleGradeChange = (grade) => {
    setCurrentGrade(grade);
    // Reset section filter when grade changes
    setCurrentSection('');
  };

  const handleSectionChange = (section) => {
    setCurrentSection(section);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const getTableInfoMessage = () => {
    const guardianCount = filteredGuardians.length;
    
    let message = `Showing ${guardianCount} guardian/s`;
    
    if (currentGrade !== 'all') {
      message += ` in Grade ${currentGrade}`;
    }
    
    if (currentSection) {
      message += `, Section ${currentSection}`;
    }
    
    if (searchQuery) {
      message += ` matching "${searchQuery}"`;
    }
    
    return message;
  };

  const handleEditClick = (guardian, e) => {
    e.stopPropagation();
    startEdit(guardian);
  };

  const handleSaveEdit = async (guardianId, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(
      guardianId, 
      async (id, data) => {
        // Update guardian info in the student record
        const updateData = {
          guardian_first_name: data.first_name,
          guardian_middle_name: data.middle_name,
          guardian_last_name: data.last_name,
          guardian_email: data.email,
          guardian_phone_number: data.phone_number,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('students')
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      }
    );
    
    if (result.success) {
      // Refresh guardians after update
      fetchGuardians();
    }
  };

  const handleRowClick = (guardianId, e) => {
    const isEditing = editingId === guardianId;
    const isInteractiveElement = e.target.closest('.edit-input') || 
                                 e.target.closest('.action-button') ||
                                 e.target.closest('button') ||
                                 e.target.closest('input');
    
    if (!isEditing && !isInteractiveElement) {
      toggleRow(guardianId);
    }
  };

  const renderEditField = (guardian, fieldName) => {
    if (editingId === guardian.id) {
      const error = validationErrors[fieldName];
      
      return (
        <div className={styles.editFieldContainer}>
          <input
            type={fieldName === 'email' ? 'email' : 'text'}
            name={fieldName}
            value={editFormData[fieldName] || ''}
            onChange={(e) => updateEditField(fieldName, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`${styles.editInput} ${error ? styles.errorInput : ''} edit-input`}
            placeholder={fieldName.replace('_', ' ')}
          />
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      );
    }
    return fieldName === 'email' || fieldName === 'phone_number'
      ? formatNA(guardian[fieldName])
      : guardian[fieldName] || '';
  };

  const renderActionButtons = (guardian) => {
    if (editingId === guardian.id) {
      return (
        <div className={`${styles.editActions} action-button`}>
          <button 
            onClick={(e) => handleSaveEdit(guardian.id, e)}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={() => cancelEdit()}
            disabled={saving}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <div className={styles.icon} onClick={(e) => handleEditClick(guardian, e)}>
        <FontAwesomeIcon icon={faPenToSquare} className="action-button" />
      </div>
    );
  };

  const renderExpandedRow = (guardian) => (
    <tr className={`${styles.expandRow} ${isRowExpanded(guardian.id) ? styles.expandRowActive : ''}`}>
      <td colSpan="8">
        <div 
          className={`${styles.guardianCard} ${styles.expandableCard}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.guardianHeader}>
            {guardian.first_name} {guardian.last_name}
          </div>
          <div className={styles.guardianInfo}>
            <strong>Guardian Details</strong>
          </div>
          <div className={styles.guardianInfo}>
            Full Name: {guardian.first_name} {guardian.middle_name} {guardian.last_name}
          </div>
          <div className={styles.guardianInfo}>
            Guardian Of: {guardian.guardian_of}
          </div>
          <div className={styles.guardianInfo}>
            Student LRN: {guardian.student_lrn || 'N/A'}
          </div>
          <div className={styles.guardianInfo}>
            Grade and Section: {guardian.grade} - {guardian.section}
          </div>
          <div className={styles.guardianInfo}>
            Email: {formatNA(guardian.email)}
          </div>
          <div className={styles.guardianInfo}>
            Phone: {formatNA(guardian.phone_number)}
          </div>
        </div>
      </td>
    </tr>
  );

  const renderEditCell = (guardian) => (
    <div className={styles.editCell}>
      {editingId === guardian.id ? (
        renderActionButtons(guardian)
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(guardian, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={styles.guardianTableContainer}>
        <div className={styles.loading}>Loading guardians...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.guardianTableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.guardianTableContainer} ref={tableRef}>
      <div className={styles.guardianTable}>
        {/* Search Input - Positioned like students page */}
        <div className={styles.searchContainer}>
          <Input
            placeholder="Search guardians by name, email, phone, or student details..."
            value={searchQuery}
            onChange={handleSearchChange}
            search={true}
          />
        </div>

        {/* Grade Filter Buttons WITH Table Info beside them */}
        <div className={styles.classContainers}>
          <div className={styles.gradeFilters}>
            <Button 
              label="All"
              tabBottom={true}
              height="xs"
              width="xs-sm"
              color="grades"
              active={currentGrade === 'all'}
              onClick={() => handleGradeChange('all')}
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
                active={currentGrade === grade}
                onClick={() => handleGradeChange(grade)}
              >
                Grade {grade}
              </Button>
            ))}
          </div>

          <div className={styles.tableInfo}>
            <p>{getTableInfoMessage()}</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.guardiansTable}>
            <thead>
              <tr>
                <th>FIRST NAME</th>
                <th>MIDDLE NAME</th>
                <th>LAST NAME</th>
                <th>GUARDIAN OF</th>
                <th>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderRow}>
                      <span>GRADE & SECTION</span>
                      <SectionDropdown
                        availableSections={availableSections}
                        selectedValue={currentSection}
                        onSelect={handleSectionChange}
                        maxHeight={250}
                      />
                    </div>
                  </div>
                </th>
                <th>EMAIL ADDRESS</th>
                <th>PHONE NO.</th>
                <th>EDIT</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuardians.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.noGuardians}>
                    {getTableInfoMessage()}
                  </td>
                </tr>
              ) : (
                filteredGuardians.map((guardian, index) => {
                  const visibleRowIndex = filteredGuardians
                    .slice(0, index)
                    .filter(g => !isRowExpanded(g.id))
                    .length;
                  
                  const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;
                  
                  return (
                    <React.Fragment key={guardian.id}>
                      {!isRowExpanded(guardian.id) && (
                        <tr 
                          className={`${styles.guardianRow} ${rowColorClass} ${editingId === guardian.id ? styles.editingRow : ''}`}
                          onClick={(e) => handleRowClick(guardian.id, e)}
                        >
                          <td>{renderEditField(guardian, 'first_name')}</td>
                          <td>{renderEditField(guardian, 'middle_name')}</td>
                          <td>{renderEditField(guardian, 'last_name')}</td>
                          <td>{guardian.guardian_of}</td>
                          <td>{guardian.grade} - {guardian.section}</td>
                          <td>{renderEditField(guardian, 'email')}</td>
                          <td>{renderEditField(guardian, 'phone_number')}</td>
                          <td>{renderEditCell(guardian)}</td>
                        </tr>
                      )}
                      {renderExpandedRow(guardian)}
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

export default GuardianTable;