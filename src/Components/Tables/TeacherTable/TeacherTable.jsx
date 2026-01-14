import React, { useMemo, useState, useEffect } from 'react';
import { useTeachers } from '../../Hooks/useEntities'; 
import { useEntityEdit } from '../../Hooks/useEntityEdit'; 
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { TeacherService } from '../../../Utils/EntityService'; 
import { sortTeachers } from '../../../Utils/SortEntities'; 
import { formatTeacherName, formatDateTime, formatNA } from '../../../Utils/Formatters';
import styles from './TeacherTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as farCircle } from "@fortawesome/free-regular-svg-icons";
import { faPenToSquare, faTrashCan, faCircle as fasCircle, faEnvelope, faList, faBook, faUsers, faUserTie } from "@fortawesome/free-solid-svg-icons";
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider';

console.log('🔄 TeacherTable.jsx LOADED - Updated with consistent expanded row');

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

const TeacherTable = ({ 
  searchTerm = '', 
  onSelectedTeachersUpdate,
  onTeacherDataUpdate,
  onSingleDeleteClick,
  onSingleInviteClick,
  refreshTeachers
}) => {
    
  const { entities: teachers, loading, error, setEntities } = useTeachers();
  const [teacherAssignments, setTeacherAssignments] = useState({});
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  const { editingId: editingTeacher, editFormData, saving, validationErrors, startEdit, cancelEdit, updateEditField, saveEdit } = useEntityEdit(
    teachers, 
    setEntities,
    'teacher',
    refreshTeachers
  );
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();

  const { success, error: toastError } = useToast();
  const { user, profile } = useAuth();
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  const teacherService = useMemo(() => new TeacherService(), []);

  // Fetch teacher assignments when teachers are loaded
  useEffect(() => {
    if (teachers.length > 0) {
      fetchTeacherAssignments();
    }
  }, [teachers]);

  const fetchTeacherAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const assignments = {};
      
      for (const teacher of teachers) {
        console.log(`📊 Fetching assignments for teacher ${teacher.id}: ${teacher.first_name} ${teacher.last_name}`);
        const result = await teacherService.getTeacherAssignments(teacher.id);
        
        assignments[teacher.id] = {
          subjects: result.subjects || [],
          sections: result.sections || [],
          teachingAssignments: result.assignments || []
        };
      }
      
      setTeacherAssignments(assignments);
      console.log('📊 All teacher assignments loaded:', assignments);
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (onTeacherDataUpdate) {
      onTeacherDataUpdate(teachers);
    }
  }, [teachers, onTeacherDataUpdate]);

  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return teachers;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return teachers.filter(teacher => 
      teacher.employee_id?.toLowerCase().includes(searchLower) ||
      teacher.first_name?.toLowerCase().includes(searchLower) ||
      teacher.middle_name?.toLowerCase().includes(searchLower) ||
      teacher.last_name?.toLowerCase().includes(searchLower) ||
      teacher.email_address?.toLowerCase().includes(searchLower) ||
      teacher.phone_no?.toLowerCase().includes(searchLower) ||
      teacher.status?.toLowerCase().includes(searchLower) ||
      teacherAssignments[teacher.id]?.subjects?.some(subject => 
        subject.subject?.subject_name?.toLowerCase().includes(searchLower) ||
        subject.subject?.subject_code?.toLowerCase().includes(searchLower)
      )
    );
  }, [teachers, searchTerm, teacherAssignments]);

  const sortedTeachers = useMemo(() => sortTeachers(filteredTeachers), [filteredTeachers]);

  const visibleSelectedTeachers = useMemo(() => {
    const visibleTeacherIds = new Set(sortedTeachers.map(teacher => teacher.id));
    return selectedTeachers.filter(id => visibleTeacherIds.has(id));
  }, [selectedTeachers, sortedTeachers]);

  useEffect(() => {
    if (onSelectedTeachersUpdate) {
      onSelectedTeachersUpdate(visibleSelectedTeachers);
    }
  }, [visibleSelectedTeachers, onSelectedTeachersUpdate]);

  const shouldHandleRowClick = (editingId, target) => {
    return !editingId || 
           target.closest('.action-button') || 
           target.closest('input') || 
           target.closest('select') ||
           target.closest('button');
  };

  const handleRowClick = (teacherId, e) => {
    if (shouldHandleRowClick(editingTeacher, e.target)) {
      toggleRow(teacherId);
    }
  };

  const handleEditClick = (teacher, e) => {
    e.stopPropagation();
    startEdit(teacher);
    toggleRow(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateEditField(name, value);
  };

  const handleInputClick = (e) => {
    e.stopPropagation();
  };

  const handleSaveEdit = async (teacherId, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(
      teacherId, 
      null,
      (id, data) => teacherService.update(id, {
        ...data,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
    );
    
    if (result.success) {
      success('Teacher information updated successfully');
      if (refreshTeachers) {
        refreshTeachers();
      }
    } else {
      console.error(result.error);
    }
  };

  const handleTeacherSelect = (teacherId, e) => {
    e.stopPropagation();
    setSelectedTeachers(prev => {
      if (prev.includes(teacherId)) {
        return prev.filter(id => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  const handleSelectAll = () => {
    const allVisibleTeacherIds = sortedTeachers.map(teacher => teacher.id);
    
    if (allVisibleTeacherIds.every(id => selectedTeachers.includes(id))) {
      setSelectedTeachers(prev => prev.filter(id => !allVisibleTeacherIds.includes(id)));
    } else {
      setSelectedTeachers(prev => {
        const newSelection = new Set([...prev, ...allVisibleTeacherIds]);
        return Array.from(newSelection);
      });
    }
  };

  const allVisibleSelected = sortedTeachers.length > 0 && 
    sortedTeachers.every(teacher => selectedTeachers.includes(teacher.id));

  const getTeacherAssignments = (teacherId) => {
    const assignments = teacherAssignments[teacherId] || {};
    
    const subjects = assignments.subjects?.map(s => 
      s.subject?.subject_name || s.subject?.subject_code || 'Unknown'
    ).filter(name => name && name !== 'Unknown').join(', ') || 'None';
    
    const teachingSections = assignments.teachingAssignments?.map(assignment => {
      const section = assignments.sections?.find(s => s.section_id === assignment.section_id);
      if (section && section.section) {
        return `Grade ${section.section.grade?.grade_level || '?'}-${section.section.section_name || '?'}`;
      }
      return '';
    }).filter(s => s).join(', ') || 'None';
    
    const adviserSection = assignments.sections?.find(s => s.is_adviser);
    const adviserDisplay = adviserSection && adviserSection.section ? 
      `Grade ${adviserSection.section.grade?.grade_level || '?'}-${adviserSection.section.section_name || '?'}` : 
      'None';
    
    return { subjects, teachingSections, adviserDisplay };
  };

  const handleDeactivateClick = async (teacher) => {
    if (!window.confirm(`Deactivate ${teacher.first_name}'s account? They won't be able to login.`)) {
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/teacher-invite/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherId: teacher.id, 
          deactivatedBy: user?.id 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEntities(prev => prev.map(t => 
          t.id === teacher.id ? { ...t, status: 'inactive' } : t
        ));
        
        success(`Account deactivated: ${teacher.first_name} ${teacher.last_name}`);
        cancelEdit();
      } else {
        toastError(data.error || 'Failed to deactivate account');
      }
    } catch (err) {
      toastError('Error: ' + err.message);
    }
  };

  const handleResendInvitation = async (teacher) => {
    if (!window.confirm(`Resend invitation to ${teacher.first_name}? Old account will be deleted and new invitation sent.`)) {
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/teacher-invite/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherId: teacher.id, 
          invitedBy: user?.id 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEntities(prev => prev.map(t => 
          t.id === teacher.id ? { ...t, status: 'pending' } : t
        ));
        
        success(`Invitation resent to: ${teacher.email_address}`);
        
        alert(
          `✅ NEW INVITATION SENT!\n\n` +
          `Teacher: ${data.teacherName}\n` +
          `Email: ${data.email}\n` +
          `New Password: ${data.tempPassword}\n` +
          `Login: ${data.loginUrl}`
        );
        cancelEdit();
      } else {
        toastError(data.error || 'Failed to resend invitation');
      }
    } catch (err) {
      toastError('Error: ' + err.message);
    }
  };

  const handleReactivateClick = async (teacher) => {
    if (!window.confirm(`Reactivate ${teacher.first_name}'s account? They will be able to login again.`)) {
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/teacher-invite/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherId: teacher.id, 
          reactivatedBy: user?.id 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEntities(prev => prev.map(t => 
          t.id === teacher.id ? { ...t, status: 'active' } : t
        ));
        
        success(`Account reactivated: ${teacher.first_name} ${teacher.last_name}`);
        cancelEdit();
      } else {
        toastError(data.error || 'Failed to reactivate account');
      }
    } catch (err) {
      toastError('Error: ' + err.message);
    }
  };

  const handleInviteClick = (teacher, e) => {
    e.stopPropagation();
    
    if (onSingleInviteClick) {
      onSingleInviteClick(teacher);
    } else {
      if (!teacher.email_address) {
        toastError('Teacher does not have an email address');
        return;
      }
      
      if (teacher.status === 'active') {
        toastError('Teacher already has an active account');
        return;
      }
      
      if (teacher.status === 'pending') {
        toastError('Teacher already has a pending invitation');
        return;
      }
      
      if (teacher.status === 'inactive') {
        toastError('Teacher account is suspended');
        return;
      }
    }
  };

  const handleDeleteClick = (teacher, e) => {
    if (e) e.stopPropagation();
    
    if (onSingleDeleteClick) {
      onSingleDeleteClick(teacher);
    }
  };

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

  const renderStatusField = (teacher) => {
    if (editingTeacher !== teacher.id) {
      return renderStatusBadge(teacher.status);
    }
    
    const currentStatus = editFormData.status || teacher.status;
    
    if (currentStatus === 'active') {
      return (
        <button 
          className={styles.deactivateButton}
          onClick={(e) => {
            e.stopPropagation();
            handleDeactivateClick(teacher);
          }}
          title="Deactivate account"
        >
          Deactivate
        </button>
      );
    }
    
    if (currentStatus === 'pending') {
      return (
        <button 
          className={styles.resendButton}
          onClick={(e) => {
            e.stopPropagation();
            handleResendInvitation(teacher);
          }}
          title="Resend invitation"
        >
          Resend
        </button>
      );
    }
    
    if (currentStatus === 'inactive') {
      return (
        <button 
          className={styles.reactivateButton}
          onClick={(e) => {
            e.stopPropagation();
            handleReactivateClick(teacher);
          }}
          title="Reactivate account"
        >
          Reactivate
        </button>
      );
    }
    
    return renderStatusBadge(currentStatus);
  };

  const renderField = (teacher, fieldName, isEditable = true) => {
    if (fieldName === 'status') {
      return renderStatusField(teacher);
    }
    
    if (editingTeacher === teacher.id && isEditable) {
      return renderEditInput(fieldName, fieldName === 'email_address' ? 'email' : 'text');
    }
    
    return fieldName === 'email_address' || fieldName === 'phone_no'
      ? formatNA(teacher[fieldName])
      : teacher[fieldName];
  };

  const renderStatusBadge = (status) => {
    if (!status || status.trim() === '') {
      return (
        <span className={styles.statusBadge} style={{ backgroundColor: '#6c757d' }}>
          No Status
        </span>
      );
    }
    
    const statusConfig = {
      'pending': { color: '#f59e0b', label: 'Pending' },
      'active': { color: '#10b981', label: 'Active' },
      'inactive': { color: '#ef4444', label: 'Inactive' },
      'invited': { color: '#8b5cf6', label: 'Invited' }
    };
    
    const config = statusConfig[status.toLowerCase()] || { color: '#6c757d', label: status };
    
    return (
      <span 
        className={styles.statusBadge}
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </span>
    );
  };

  const renderEditCell = (teacher) => (
    <div className={styles.editCell}>
      {editingTeacher === teacher.id ? (
        <div className={`${styles.editActions} action-button`}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleSaveEdit(teacher.id, e);
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
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(teacher, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  const renderExpandedRow = (teacher) => {
    const addedAt = formatDateTimeLocal(teacher.created_at);
    const updatedAt = teacher.updated_at ? formatDateTimeLocal(teacher.updated_at) : 'Never updated';
    const invitedAt = teacher.invited_at ? formatDateTimeLocal(teacher.invited_at) : 'Not invited';
    
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
      
    const updatedByName = teacher.updated_by 
      ? (teacher.updated_by_user 
          ? `${teacher.updated_by_user.first_name || ''} ${teacher.updated_by_user.last_name || ''}`.trim() || 
            teacher.updated_by_user.username || 
            teacher.updated_by_user.email || 
            'User'
          : (currentUserId && teacher.updated_by === currentUserId ? currentUserName : 'User')
        )
      : 'Not yet updated';

    const assignments = getTeacherAssignments(teacher.id);

    // Format status for plain text display
    const formatStatusText = (status) => {
      if (!status) return 'No Status';
      const statusMap = {
        'pending': 'Pending',
        'active': 'Active',
        'inactive': 'Inactive',
        'invited': 'Invited'
      };
      return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(teacher.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="11">
          <div 
            className={`${styles.studentCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.studentHeader}>
              {formatTeacherName(teacher)}
            </div>
          
            <div className={styles.details}>
              <div>
                <div className={styles.studentInfo}>
                  <strong>Teacher Details</strong>
                </div>
                <div className={styles.studentInfo}>Employee ID: {teacher.employee_id}</div>
                <div className={styles.studentInfo}>Full Name: {formatTeacherName(teacher)}</div>
                <div className={styles.studentInfo}>Email: {formatNA(teacher.email_address)}</div>
                <div className={styles.studentInfo}>Phone: {formatNA(teacher.phone_no)}</div>
                <div className={styles.studentInfo}>Status: {formatStatusText(teacher.status)}</div>
              </div>

              <div>
                <div className={styles.studentInfo}>
                  <strong>Teaching Assignments</strong>
                </div>
                <div className={styles.studentInfo}>Subjects: {assignments.subjects}</div>
                <div className={styles.studentInfo}>Teaching Sections: {assignments.teachingSections}</div>
                <div className={styles.studentInfo}>Adviser Section: {assignments.adviserDisplay}</div>
              </div>
          
              <div>
                <div className={styles.studentInfo}>
                  <strong>Record Information</strong>
                </div>
                {teacher.status === 'pending' && (
                  <div className={styles.studentInfo}>
                    Invitation Sent: {invitedAt}
                  </div>
                )}
                <div className={styles.studentInfo}>
                  Added: {addedAt}
                </div>
                <div className={styles.studentInfo}>
                  Last Updated: {updatedAt}
                </div>
                <div className={styles.studentInfo}>
                  Last Updated By: {updatedByName}
                  {teacher.updated_by && teacher.updated_by_user && (
                    <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                      ({teacher.updated_by_user.username || teacher.updated_by_user.email})
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

  if (loading || loadingAssignments) {
    return (
      <div className={styles.teacherTableContainer}>
        <div className={styles.loading}>Loading teachers and assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.teacherTableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.teacherTableContainer} ref={tableRef}>
      <div className={styles.teachersTable}>
        <div className={styles.tableWrapper}>
          <table className={styles.teachersTable}>
            <thead>
              <tr>
                <th>
                  <div className={styles.icon} onClick={handleSelectAll}>
                    <FontAwesomeIcon 
                      icon={allVisibleSelected ? fasCircle : farCircle} 
                      style={{ 
                        cursor: 'pointer',
                        color: allVisibleSelected ? '#007bff' : '' 
                      }}
                    />
                  </div>
                </th>
                <th>EMPLOYEE ID</th>
                <th>FIRST NAME</th>
                <th>MIDDLE NAME</th>
                <th>LAST NAME</th>
                <th>EMAIL ADDRESS</th>
                <th>PHONE NO.</th>
                <th>STATUS</th>
                <th>INVITE</th>
                <th>EDIT</th>
                <th>DELETE</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan="11" className={styles.noTeachers}>
                    {searchTerm 
                      ? `No teachers found matching "${searchTerm}"`
                      : 'No teachers found'
                    }
                  </td>
                </tr>
              ) : (
                sortedTeachers.map((teacher, index) => {
                  const visibleRowIndex = sortedTeachers
                    .slice(0, index)
                    .filter(t => !isRowExpanded(t.id))
                    .length;
                  
                  const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;
                  const isSelected = selectedTeachers.includes(teacher.id);
                  const isInviteDisabled = !teacher.email_address || 
                                          teacher.status === 'active' || 
                                          teacher.status === 'pending' || 
                                          teacher.status === 'inactive';

                  return (
                    <React.Fragment key={teacher.id}>
                      {!isRowExpanded(teacher.id) && (
                        <tr 
                          className={`${styles.teacherRow} ${rowColorClass} ${editingTeacher === teacher.id ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
                          onClick={(e) => handleRowClick(teacher.id, e)}
                        >
                          <td>
                            <div className={styles.icon} onClick={(e) => handleTeacherSelect(teacher.id, e)}>
                              <FontAwesomeIcon 
                                icon={isSelected ? fasCircle : farCircle} 
                                style={{ 
                                  cursor: 'pointer', 
                                  color: isSelected ? '#007bff' : '' 
                                }}
                              />
                            </div>
                          </td>
                          <td>{renderField(teacher, 'employee_id')}</td>
                          <td>{renderField(teacher, 'first_name')}</td>
                          <td>{renderField(teacher, 'middle_name')}</td>
                          <td>{renderField(teacher, 'last_name')}</td>
                          <td>{renderField(teacher, 'email_address')}</td>
                          <td>{renderField(teacher, 'phone_no')}</td>
                          <td>{renderField(teacher, 'status', false)}</td>
                          <td>
                            <div className={styles.icon}>
                              <ForwardToInboxIcon sx={{ fontSize: 37, mb: -0.7 }}
                                className="action-button"
                                style={{ 
                                  cursor: isInviteDisabled ? 'default' : 'pointer',
                                  color: teacher.status === 'pending' ? '#f59e0b' : 
                                         teacher.status === 'active' ? '#10b981' : 
                                         teacher.status === 'inactive' ? '#ef4444' : 
                                         '',
                                  opacity: isInviteDisabled ? 0.6 : 1
                                }}
                                title={teacher.status === 'pending' ? 'Invitation sent - pending account creation' : 
                                       teacher.status === 'active' ? 'Account active' : 
                                       teacher.status === 'inactive' ? 'Account suspended' : 
                                       !teacher.email_address ? 'No email address' :
                                       'Send account invitation'}
                                onClick={(e) => handleInviteClick(teacher, e)}
                              />
                            </div>
                          </td>
                          <td>{renderEditCell(teacher)}</td>
                          <td>
                            <div className={styles.icon}>
                              <FontAwesomeIcon 
                                icon={faTrashCan} 
                                className="action-button"
                                onClick={(e) => handleDeleteClick(teacher, e)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                      {renderExpandedRow(teacher)}
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

export default TeacherTable;