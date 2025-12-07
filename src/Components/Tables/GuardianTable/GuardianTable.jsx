import React, { useState, useEffect, useMemo } from 'react';
import { useGuardians } from '../../Hooks/useEntities';
import { useEntityEdit } from '../../Hooks/useEntityEdit';
import { useRowExpansion } from '../../Hooks/useRowExpansion';
import { GuardianService } from '../../../Utils/EntityService'; 
import { grades } from '../../../Utils/tableHelpers';
import { formatNA } from '../../../Utils/Formatters';
import { sortGuardians } from '../../../Utils/SortEntities'; 
import Button from '../../UI/Buttons/Button/Button';
import styles from './GuardianTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { sortEntities } from '../../../Utils/SortEntities';

const GuardianTable = () => {
  const { currentClass, entities: guardians, loading, error, changeClass, setEntities } = useGuardians();
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { 
    editingId, 
    editFormData, 
    saving, 
    validationErrors,  // ADD THIS
    startEdit, 
    cancelEdit, 
    updateEditField, 
    saveEdit 
  } = useEntityEdit(guardians, setEntities, 'guardian');
  const [localGuardians, setLocalGuardians] = useState([]);

  // INDUSTRY STANDARD: Create service instance
  const guardianService = useMemo(() => new GuardianService(), []);

  // Sync and sort local state with hook state
  useEffect(() => {
    if (guardians && guardians.length > 0) {
      const sortedGuardians = sortGuardians(guardians);
      setLocalGuardians(sortedGuardians);
    } else {
      setLocalGuardians([]);
    }
  }, [guardians]);

  // Use sorted guardians for display
  const sortedGuardians = useMemo(() => {
  return sortEntities(localGuardians, { type: 'guardian' });
}, [localGuardians]);

  const handleClassChange = (className) => {
    changeClass(className);
  };

  const handleEditClick = (guardian, e) => {
    e.stopPropagation();
    startEdit(guardian);
  };

  // INDUSTRY STANDARD: Using instance method
  const handleSaveEdit = async (guardianId, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(
      guardianId, 
      currentClass, 
      (id, data) => guardianService.updateGuardian(id, data)
    );
    
    if (result.success) {
      // Update local state
      const updatedGuardians = await guardianService.fetchAll();
      const filteredGuardians = currentClass === 'all' 
        ? updatedGuardians
        : updatedGuardians.filter(g => g.grade === currentClass);
      
      // Sort the updated guardians
      const sortedUpdatedGuardians = sortGuardians(filteredGuardians);
      setLocalGuardians(sortedUpdatedGuardians);
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
            Grade and Section: {guardian.grade}-{guardian.section}
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
            <p>Showing {sortedGuardians.length} guardian/s {currentClass !== 'all' ? `in Grade ${currentClass}` : 'across all grades'}</p>
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
                <th>GRADE & SECTION</th>
                <th>EMAIL ADDRESS</th>
                <th>PHONE NO.</th>
                <th>EDIT</th>
              </tr>
            </thead>
            <tbody>
              {sortedGuardians.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.noGuardian}>
                    {currentClass === 'all' 
                      ? 'No guardians found across all grades' 
                      : `No guardians found in Grade ${currentClass}`}
                  </td>
                </tr>
              ) : (
                sortedGuardians.map((guardian, index) => {
                  const visibleRowIndex = sortedGuardians
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
                          <td>{guardian.grade}-{guardian.section}</td>
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