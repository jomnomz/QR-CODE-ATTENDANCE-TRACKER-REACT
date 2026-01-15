// components/Table/Table.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useEntityEdit } from '../../Hooks/useEntityEdit'; 
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider';
import { formatDateTime, formatNA } from '../../../Utils/Formatters';
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';
import Button from '../../UI/Buttons/Button/Button';
import styles from './Table.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as farCircle } from "@fortawesome/free-regular-svg-icons";
import { faPenToSquare, faTrashCan, faCircle as fasCircle, faQrcode } from "@fortawesome/free-solid-svg-icons";

const Table = ({
  // Data & Configuration
  data = [],
  columns = [],
  entityType = 'student',
  service,
  loading = false,
  error = null,
  
  // Table Features
  enableSearch = true,
  enableGradeFilter = false,
  enableSectionFilter = false,
  enableSelection = true,
  enableExpandedRows = true,
  enableActions = true,
  
  // Filters & Search
  searchTerm = '',
  currentClass = 'all',
  selectedSection = '',
  onClassChange,
  onSectionFilter,
  onClearSectionFilter,
  onSearch,
  
  // Data Management
  refreshData,
  refreshAllData,
  onSingleDeleteClick,
  onSingleActionClick,
  onDataUpdate,
  onSelectedRowsUpdate,
  
  // Additional Configuration
  grades = [],
  allUniqueSections = [],
  currentGradeSections = [],
  
  // Custom Renderers
  renderExpandedContent,
  renderCustomActions,
  renderCustomHeader,
  
  // Custom Handlers
  onRowClick,
  onEditSave,
  onBeforeEditSave,
  
  // Additional Props
  additionalProps = {},
}) => {
  // State
  const [selectedRows, setSelectedRows] = useState([]);
  const [sectionInputValue, setSectionInputValue] = useState('');
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Hooks
  const { editingId, editFormData, saving, validationErrors, startEdit, cancelEdit, updateEditField, saveEdit } = useEntityEdit(
    data,
    additionalProps.setData || (() => {}),
    entityType,
    refreshAllData
  );
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { success } = useToast();
  const { user, profile } = useAuth();
  
  // Memoized values
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return data.filter(row => 
      columns.some(column => {
        if (column.isAction || !column.key) return false;
        const value = row[column.key];
        return value?.toString().toLowerCase().includes(searchLower);
      })
    );
  }, [data, searchTerm, columns]);
  
  const sortedData = useMemo(() => {
    // Default sorting by ID or implement custom sorting
    return [...filteredData].sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [filteredData]);
  
  const visibleSelectedRows = useMemo(() => {
    const visibleRowIds = new Set(sortedData.map(row => row.id));
    return selectedRows.filter(id => visibleRowIds.has(id));
  }, [selectedRows, sortedData]);
  
  // Effects
  useEffect(() => {
    if (onSelectedRowsUpdate) {
      onSelectedRowsUpdate(visibleSelectedRows);
    }
  }, [visibleSelectedRows, onSelectedRowsUpdate]);
  
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(data);
    }
  }, [data, onDataUpdate]);
  
  // Event Handlers
  const handleRowClick = (rowId, e) => {
    if (enableExpandedRows && (!editingId || !e.target.closest('.action-button'))) {
      toggleRow(rowId);
    }
    if (onRowClick) {
      onRowClick(rowId, e);
    }
  };
  
  const handleEditClick = (row, e) => {
    e.stopPropagation();
    startEdit(row);
    if (enableExpandedRows) {
      toggleRow(null);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateEditField(name, value);
    
    if (name === 'section') {
      setSectionInputValue(value);
    }
  };
  
  const handleSaveEdit = async (rowId, e) => {
    if (e) e.stopPropagation();
    
    if (onBeforeEditSave) {
      const shouldContinue = await onBeforeEditSave(rowId, editFormData);
      if (!shouldContinue) return;
    }
    
    const result = await saveEdit(
      rowId,
      currentClass,
      async (id, data) => {
        const updateData = {
          ...data,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        };
        
        if (onEditSave) {
          return await onEditSave(id, updateData);
        }
        
        return await service.update(id, updateData);
      }
    );
    
    if (result.success) {
      success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} updated successfully`);
      if (refreshData) refreshData();
    }
  };
  
  const handleRowSelect = (rowId, e) => {
    if (!enableSelection) return;
    e.stopPropagation();
    setSelectedRows(prev => {
      if (prev.includes(rowId)) {
        return prev.filter(id => id !== rowId);
      }
      return [...prev, rowId];
    });
  };
  
  const handleSelectAll = () => {
    if (!enableSelection) return;
    
    const allVisibleRowIds = sortedData.map(row => row.id);
    if (allVisibleRowIds.every(id => selectedRows.includes(id))) {
      setSelectedRows(prev => prev.filter(id => !allVisibleRowIds.includes(id)));
    } else {
      setSelectedRows(prev => {
        const newSelection = new Set([...prev, ...allVisibleRowIds]);
        return Array.from(newSelection);
      });
    }
  };
  
  const handleActionClick = (row, e, actionType = 'default') => {
    e.stopPropagation();
    
    if (actionType === 'delete' && onSingleDeleteClick) {
      onSingleDeleteClick(row);
    } else if (actionType === 'custom' && onSingleActionClick) {
      onSingleActionClick(row);
    } else if (actionType === 'qr' && onSingleActionClick) {
      onSingleActionClick(row);
    }
  };
  
  // Render Functions
  const renderEditInput = (fieldName, type = 'text', placeholder = '') => (
    <input
      type={type}
      name={fieldName}
      value={editFormData[fieldName] || ''}
      onChange={handleInputChange}
      onClick={(e) => e.stopPropagation()}
      className={`${styles.editInput} ${validationErrors[fieldName] ? styles.errorInput : ''} edit-input`}
      placeholder={placeholder}
    />
  );
  
  const renderField = (row, column) => {
    if (editingId === row.id && !column.isAction) {
      if (column.renderEdit) {
        return column.renderEdit(row, editFormData, validationErrors, handleInputChange);
      }
      
      const fieldType = column.editType || 'text';
      return renderEditInput(column.key, fieldType, column.label);
    }
    
    if (column.render) {
      return column.render(row);
    }
    
    return formatNA(row[column.key]);
  };
  
  const renderActionCell = (row, column) => {
    if (column.key === 'edit') {
      return editingId === row.id ? (
        <div className={styles.editActions}>
          <button 
            onClick={(e) => handleSaveEdit(row.id, e)}
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
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(row, e)}
            className="action-button"
          />
        </div>
      );
    }
    
    if (column.key === 'delete') {
      return (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faTrashCan} 
            className="action-button"
            onClick={(e) => handleActionClick(row, e, 'delete')}
          />
        </div>
      );
    }
    
    if (column.key === 'qr_code') {
      return (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faQrcode} 
            onClick={(e) => handleActionClick(row, e, 'qr')}
            className="action-button"
          />
        </div>
      );
    }
    
    if (column.renderAction) {
      return column.renderAction(row);
    }
    
    return null;
  };
  
  const renderExpandedRowContent = (row) => {
    if (renderExpandedContent) {
      return renderExpandedContent(row);
    }
    
    // Default expanded content
    return (
      <div className={styles.expandedContent}>
        <div className={styles.expandedHeader}>
          {row.first_name && row.last_name 
            ? `${row.first_name} ${row.last_name}`
            : 'Details'
          }
        </div>
        <div className={styles.expandedDetails}>
          {columns
            .filter(col => !col.isAction)
            .map(col => (
              <div key={col.key} className={styles.detailItem}>
                <strong>{col.label}:</strong> {formatNA(row[col.key])}
              </div>
            ))}
        </div>
      </div>
    );
  };
  
  const renderHeader = () => {
  if (renderCustomHeader) {
    return renderCustomHeader();
  }
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: '10px'
    }}>
      {enableGradeFilter && (
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <Button 
            label="All"
            tabBottom={true}
            height="xs"
            width="xs-sm"
            color="grades"
            active={currentClass === 'all'}
            onClick={() => onClassChange && onClassChange('all')}
          />
          {grades.map(grade => (
            <Button 
              key={grade}
              label={`Grade ${grade}`}
              tabBottom={true}
              height="xs"
              width="xs-sm"
              color="grades"
              active={currentClass === grade}
              onClick={() => onClassChange && onClassChange(grade)}
            >
              Grade {grade}
            </Button>
          ))}
        </div>
      )}
      
      <div style={{
        textAlign: 'right',
        whiteSpace: 'nowrap',
        marginLeft: 'auto'
      }}>
        <p style={{
          margin: 0,
          fontWeight: 'bold',
          color: '#003a02',
          fontSize: '14px'
        }}>
          Showing {sortedData.length} {entityType}(s)
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedSection && ` in Section ${selectedSection}`}
          {currentClass !== 'all' && ` in Grade ${currentClass}`}
          {selectedRows.length > 0 && ` (${selectedRows.length} selected)`}
        </p>
      </div>
    </div>
  );
};
  
  // Loading & Error States
  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.loading}>Loading {entityType}s...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className={styles.tableContainer} ref={tableRef}>
      {renderHeader()}
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {enableSelection && (
                <th>
                  <div className={styles.icon} onClick={handleSelectAll}>
                    <FontAwesomeIcon 
                      icon={selectedRows.length === sortedData.length ? fasCircle : farCircle}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </th>
              )}
              
              {columns.map(column => (
                <th key={column.key}>
                  {column.key === 'section' && enableSectionFilter ? (
                    <div className={styles.sectionHeader}>
                      <span>{column.label}</span>
                      <SectionDropdown 
                        availableSections={currentGradeSections || allUniqueSections}
                        selectedValue={selectedSection}
                        onSelect={onSectionFilter}
                      />
                    </div>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0)} className={styles.noData}>
                  No {entityType}s found
                  {searchTerm && ` matching "${searchTerm}"`}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const isSelected = selectedRows.includes(row.id);
                const rowColorClass = index % 2 === 0 ? styles.rowEven : styles.rowOdd;
                
                return (
                  <React.Fragment key={row.id}>
                    {!isRowExpanded(row.id) && (
                      <tr 
                        className={`${styles.tableRow} ${rowColorClass} ${editingId === row.id ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
                        onClick={(e) => handleRowClick(row.id, e)}
                      >
                        {enableSelection && (
                          <td>
                            <div className={styles.icon} onClick={(e) => handleRowSelect(row.id, e)}>
                              <FontAwesomeIcon 
                                icon={isSelected ? fasCircle : farCircle}
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                          </td>
                        )}
                        
                        {columns.map(column => (
                          <td key={column.key}>
                            {column.isAction 
                              ? renderActionCell(row, column)
                              : renderField(row, column)
                            }
                          </td>
                        ))}
                      </tr>
                    )}
                    
                    {enableExpandedRows && isRowExpanded(row.id) && (
                      <tr className={`${styles.expandRow} ${styles.expandRowActive}`}>
                        <td colSpan={columns.length + (enableSelection ? 1 : 0)}>
                          {renderExpandedRowContent(row)}
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
    </div>
  );
};

export default Table;