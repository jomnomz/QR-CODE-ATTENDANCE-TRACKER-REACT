 import React, { useMemo, useState, useEffect } from 'react';
import { useTeachers } from '../../Hooks/useEntities'; 
import { useEntityEdit } from '../../Hooks/useEntityEdit'; 
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { useTeacherActions } from '../../Hooks/useEntityActions'; 
import { TeacherService } from '../../../Utils/EntityService'; 
import { sortTeachers } from '../../../Utils/SortEntities'; 
import { formatTeacherName, formatDateTime, formatNA } from '../../../Utils/Formatters';
import Button from '../../UI/Buttons/Button/Button';
import InviteModal from '../../Modals/InviteModal/InviteModal';
import styles from './TeacherTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as farCircle } from "@fortawesome/free-regular-svg-icons";
import { faPenToSquare, faTrashCan, faCircle as fasCircle, faEnvelope, faList } from "@fortawesome/free-solid-svg-icons";
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider';

console.log('🔄 TeacherTable.jsx LOADED - Version with /api/teacher-invite URLs');

const TeacherTable = ({ 
  searchTerm = '', 
  onSelectedTeachersUpdate,
  onTeacherDataUpdate,
  onSingleDeleteClick,
  refreshTeachers
}) => {
    
  const { entities: teachers, loading, error, setEntities } = useTeachers();
  
  const { editingId: editingTeacher, editFormData, saving, validationErrors, startEdit, cancelEdit, updateEditField, saveEdit } = useEntityEdit(
    teachers, 
    setEntities,
    'teacher',
    refreshTeachers
  );
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { 
    handleDeleteClick 
  } = useTeacherActions(setEntities);

  const { success, error: toastError, info } = useToast();
  const { user, profile } = useAuth();
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedTeacherForInvite, setSelectedTeacherForInvite] = useState(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  const teacherService = useMemo(() => new TeacherService(), []);

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
      teacher.status?.toLowerCase().includes(searchLower)
    );
  }, [teachers, searchTerm]);

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

  const handleSelectChange = (e) => {
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
      null, // No grade for teachers
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

  // ==================== INVITATION FUNCTIONS ====================
  const handleInviteClick = (teacher, e) => {
    e.stopPropagation();
    
    if (!teacher.email_address) {
      toastError('Teacher does not have an email address');
      return;
    }
    
    if (teacher.status === 'active') {
      info('Teacher already has an active account');
      return;
    }
    
    if (teacher.status === 'pending') {
      info('Teacher already has a pending invitation');
      return;
    }
    
    if (teacher.status === 'inactive') {
      toastError('Teacher account is suspended');
      return;
    }
    
    setSelectedTeacherForInvite(teacher);
    setInviteModalOpen(true);
  };

  const handleBulkInviteClick = () => {
    if (visibleSelectedTeachers.length === 0) {
      info('Please select at least one teacher to invite');
      return;
    }
    
    setInviteModalOpen(true);
  };

  const sendInvitation = async (teacherId) => {
  setSendingInvite(true);
  try {
    const response = await fetch('http://localhost:5000/api/teacher-invite/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: teacherId, invitedBy: user?.id }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Update teacher status
      setEntities(prev => prev.map(teacher => 
        teacher.id === teacherId 
          ? { ...teacher, status: 'pending' }
          : teacher
      ));
      
      // AUTO-OPEN EMAIL WITH TEMPLATE
      if (data.emailTemplate) {
        // Create a temporary HTML file and open it
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Email to ${data.teacherName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .container { max-width: 800px; margin: 0 auto; }
              .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .actions { margin-top: 20px; display: flex; gap: 10px; }
              button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
              .copy-btn { background: #3B82F6; color: white; }
              .email-btn { background: #10b981; color: white; }
              .close-btn { background: #6b7280; color: white; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>📧 Email for ${data.teacherName}</h2>
                <p>Copy this email and send to the teacher</p>
              </div>
              <div class="content">
                <h3>Subject: ${data.emailTemplate.subject}</h3>
                <hr>
                <div id="email-content">
                  ${data.emailTemplate.html}
                </div>
                <hr>
                <div class="actions">
                  <button class="copy-btn" onclick="copyToClipboard()">📋 Copy Email HTML</button>
                  <button class="email-btn" onclick="openEmailClient()">📨 Open Email Client</button>
                  <button class="close-btn" onclick="window.close()">Close</button>
                </div>
              </div>
            </div>
            <script>
              function copyToClipboard() {
                const html = document.getElementById('email-content').innerHTML;
                const subject = "${data.emailTemplate.subject}";
                const text = "${data.emailTemplate.text.replace(/\n/g, '\\\\n')}";
                
                // Copy HTML version
                navigator.clipboard.writeText(html)
                  .then(() => alert('✅ Email HTML copied to clipboard!'));
              }
              
              function openEmailClient() {
                const subject = encodeURIComponent("${data.emailTemplate.subject}");
                const body = encodeURIComponent(\`${data.emailTemplate.text}\`);
                window.open('mailto:${data.email}?subject=' + subject + '&body=' + body);
              }
            </script>
          </body>
          </html>
        `;
        
        // Open in new window
        const win = window.open();
        win.document.write(htmlContent);
        win.document.close();
      }
      
      // Also show simple alert with credentials
      alert(
        `✅ TEACHER ACCOUNT CREATED!\n\n` +
        `Teacher: ${data.teacherName}\n` +
        `Email: ${data.email}\n` +
        `Password: ${data.tempPassword}\n` +
        `Login: ${data.loginUrl}\n\n` +
        `A new window opened with the email template.\n` +
        `Copy it and send to the teacher.`
      );
      
      success('Account created! Email template opened.');
      return true;
    } else {
      toastError(data.error || 'Failed to create account');
      return false;
    }
  } catch (err) {
    toastError('Error: ' + err.message);
    return false;
  } finally {
    setSendingInvite(false);
  }
};

  const sendBulkInvitations = async (teacherIds) => {
    setSendingInvite(true);
    try {
      console.log('🔄 Sending bulk invitations for teacher IDs:', teacherIds);
      console.log('📤 Making request to: /api/teacher-invite/invite/bulk');
      
      const response = await fetch('/api/teacher-invite/invite/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherIds: teacherIds,
          invitedBy: user?.id
        }),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('📥 Response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      console.log('📊 Parsed response data:', data);

      if (data.success) {
        // Update local state for successful invitations
        setEntities(prev => prev.map(teacher => 
          teacherIds.includes(teacher.id) && data.results?.success?.some(r => r.teacherId === teacher.id)
            ? { ...teacher, status: 'pending' }
            : teacher
        ));
        
        success(`Sent ${data.results?.success?.length || 0} invitations successfully`);
        
        // Show failed invitations if any
        if (data.results?.failed?.length > 0) {
          info(`${data.results.failed.length} invitations failed`);
        }
        
        return true;
      } else {
        toastError(data.error || 'Failed to send bulk invitations');
        return false;
      }
    } catch (err) {
      console.error('❌ Error in sendBulkInvitations:', err);
      toastError('Error sending bulk invitations: ' + err.message);
      return false;
    } finally {
      setSendingInvite(false);
    }
  };
  // ==================== END INVITATION FUNCTIONS ====================

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

  const renderStatusSelect = (fieldName = 'status') => (
    <select
      name={fieldName}
      value={editFormData[fieldName] || ''}
      onChange={handleSelectChange}
      onClick={handleInputClick}
      className={`${styles.statusSelect} ${styles.editInput} ${validationErrors[fieldName] ? styles.errorInput : ''} edit-input`}
    >
      <option value="">No Status</option>
      <option value="pending">Pending</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );

  const renderField = (teacher, fieldName, isEditable = true) => {
    if (editingTeacher === teacher.id && isEditable) {
      if (fieldName === 'status') {
        return renderStatusSelect(fieldName);
      }
      return renderEditInput(fieldName, fieldName === 'email_address' ? 'email' : 'text');
    }
    
    if (fieldName === 'status') {
      return renderStatusBadge(teacher.status);
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
      'inactive': { color: '#ef4444', label: 'Inactive' }
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
    const addedAt = formatDateTime(teacher.created_at);
    const updatedAt = teacher.updated_at ? formatDateTime(teacher.updated_at) : 'Never updated';
    const invitedAt = teacher.invited_at ? formatDateTime(teacher.invited_at) : 'Not invited';
    
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

    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(teacher.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="12">
          <div 
            className={`${styles.teacherCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.teacherHeader}>
              {formatTeacherName(teacher)}
            </div>
            
            <div className={styles.teacherInfo}>
              <strong>Teacher Details</strong>
            </div>
            <div className={styles.teacherInfo}>Employee ID: {teacher.employee_id}</div>
            <div className={styles.teacherInfo}>Full Name: {teacher.first_name} {teacher.middle_name} {teacher.last_name}</div>
            <div className={styles.teacherInfo}>Email: {formatNA(teacher.email_address)}</div>
            <div className={styles.teacherInfo}>Phone: {formatNA(teacher.phone_no)}</div>
            <div className={styles.teacherInfo}>
              Status: {renderStatusBadge(teacher.status)}
            </div>
            
            <div className={styles.teacherInfo}>
              <strong>Account Information</strong>
            </div>
            {teacher.status === 'pending' && (
              <div className={styles.teacherInfo}>
                Invitation Sent: {invitedAt}
              </div>
            )}
            
            <div className={styles.teacherInfo}>
              <strong>Record Information</strong>
            </div>
            <div className={styles.teacherInfo}>
              Added: {addedAt}
            </div>
            <div className={styles.teacherInfo}>
              Last Updated: {updatedAt}
            </div>
            <div className={styles.teacherInfo}>
              Last Updated By: {updatedByName}
              {teacher.updated_by && teacher.updated_by_user && (
                <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                  ({teacher.updated_by_user.username || teacher.updated_by_user.email})
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
      <div className={styles.teacherTableContainer}>
        <div className={styles.loading}>Loading teachers...</div>
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
      {/* Bulk Action Buttons */}
      <div className={styles.actionButtons}>
        {visibleSelectedTeachers.length > 0 && (
          <Button
            label={`Invite ${visibleSelectedTeachers.length} Selected`}
            color="primary"
            onClick={handleBulkInviteClick}
            icon={<FontAwesomeIcon icon={faEnvelope} />} 
            width="auto"
            height="sm"
            disabled={sendingInvite}
          />
        )}
      </div>

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
                <th>CLASS LIST</th>
                <th>EDIT</th>
                <th>DELETE</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan="12" className={styles.noTeachers}>
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
                          <td>{renderField(teacher, 'status')}</td>
                          <td>
                            <div className={styles.icon}>
                              <FontAwesomeIcon 
                                icon={faEnvelope} 
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
                          <td>
                            <div className={styles.icon}>
                              <FontAwesomeIcon 
                                icon={faList} 
                                className="action-button"
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Add your class list functionality here
                                  console.log('View class list for:', teacher.id);
                                }}
                              />
                            </div>
                          </td>
                          <td>{renderEditCell(teacher)}</td>
                          <td>
                            <div className={styles.icon}>
                              <FontAwesomeIcon 
                                icon={faTrashCan} 
                                className="action-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSingleDeleteClick) {
                                    onSingleDeleteClick(teacher);
                                  } else {
                                    handleDeleteClick(teacher);
                                  }
                                }}
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

      {/* Invite Modal */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setSelectedTeacherForInvite(null);
        }}
        teacher={selectedTeacherForInvite}
        selectedTeachers={visibleSelectedTeachers}
        teacherData={teachers}
        onConfirm={sendInvitation}
        onConfirmBulk={sendBulkInvitations}
        loading={sendingInvite}
      />
    </div>
  );
};

export default TeacherTable;