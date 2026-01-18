import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../UI/Buttons/Button/Button';
import styles from './MessageTable.module.css';
import { supabase } from '../../../lib/supabase';
import { useRowExpansion } from '../../Hooks/useRowExpansion';
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';

const MessageTable = ({
  searchTerm = '',
  selectedSection = '',
  onSectionsUpdate,
  onGradeUpdate,
  onSectionSelect,
  availableSections = [],
  loading: parentLoading = false,
  selectedDate = '', // Date filter from parent
}) => {
  const [currentClass, setCurrentClass] = useState('all');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableSectionsLocal, setAvailableSectionsLocal] = useState([]);

  // Use the row expansion hook
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();

  // Get unique sections from current messages
  const allUniqueSections = useMemo(() => {
    const sections = messages
      .map(message => message.section || '')
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    const sorted = uniqueSections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return sorted;
  }, [messages]);

  // Get sections for current grade
  const currentGradeSections = useMemo(() => {
    if (currentClass === 'all') {
      return allUniqueSections;
    }
    
    const sections = messages
      .filter(message => message.grade === currentClass)
      .map(message => message.section || '')
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [messages, currentClass, allUniqueSections]);

  // Update available sections based on current grade
  useEffect(() => {
    setAvailableSectionsLocal(currentGradeSections);
    if (onSectionsUpdate) {
      onSectionsUpdate(allUniqueSections);
    }
  }, [currentGradeSections, allUniqueSections, onSectionsUpdate]);

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
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

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return `+63 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('639')) {
      return `+63 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
    }
    
    return phone;
  };

  // Helper function to get guardian full name
  const getGuardianName = (student) => {
    if (!student) return 'N/A';
    
    const firstName = student.guardian_first_name || '';
    const middleName = student.guardian_middle_name ? ` ${student.guardian_middle_name}` : '';
    const lastName = student.guardian_last_name || '';
    
    const fullName = `${firstName}${middleName} ${lastName}`.trim();
    return fullName || 'N/A';
  };

  const fetchSMSLogs = async (grade = 'all', dateFilter = '') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📱 Fetching SMS logs for ${grade === 'all' ? 'all grades' : `Grade ${grade}`}`);
      
      let query = supabase
        .from('sms_logs')
        .select(`
          *,
          student_by_id:students!sms_logs_student_id_fkey (
            id,
            lrn,
            first_name,
            last_name,
            grade_id,
            section_id,
            grade:grades(grade_level),
            section:sections(section_name),
            guardian_first_name,
            guardian_middle_name,
            guardian_last_name,
            guardian_phone_number,
            guardian_email
          ),
          student_by_lrn:students!sms_logs_student_lrn_fkey (
            id,
            lrn,
            first_name,
            last_name,
            grade_id,
            section_id,
            grade:grades(grade_level),
            section:sections(section_name),
            guardian_first_name,
            guardian_middle_name,
            guardian_last_name,
            guardian_phone_number,
            guardian_email
          )
        `)
        .order('sent_at', { ascending: false });

      // Apply date filter if provided
      if (dateFilter) {
        query = query.gte('sent_at', `${dateFilter}T00:00:00.000Z`)
                   .lt('sent_at', `${dateFilter}T23:59:59.999Z`);
        console.log(`📅 Filtering by date: ${dateFilter}`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      console.log(`✅ Loaded ${data?.length || 0} SMS logs`);

      const transformedMessages = (data || []).map(log => {
        const student = log.student_by_id || log.student_by_lrn;
        
        // Get guardian name from student data
        const guardianName = student ? getGuardianName(student) : (log.guardian_name || 'N/A');
        const guardianPhone = student?.guardian_phone_number || log.phone_number || 'N/A';
        const formattedPhone = formatPhoneNumber(guardianPhone);
        
        const isDemo = log.demo_mode || log.provider === 'demo' || log.cost === '₱0.00';

        return {
          id: log.id,
          guardian_name: guardianName,
          guardian_first_name: student?.guardian_first_name || '',
          guardian_middle_name: student?.guardian_middle_name || '',
          guardian_last_name: student?.guardian_last_name || '',
          phone_number: guardianPhone,
          formatted_phone: formattedPhone,
          message: log.message,
          student_lrn: student?.lrn || log.student_lrn,
          student_first_name: student?.first_name || '',
          student_last_name: student?.last_name || '',
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
          grade: student?.grade?.grade_level || 'N/A',
          section: student?.section?.section_name || 'N/A',
          scan_type: log.scan_type || 'N/A',
          provider: log.provider || 'iprogsms',
          status: log.status || 'sent',
          cost: log.cost || '₱0.30',
          reason: log.reason || 'N/A',
          provider_id: log.provider_id,
          demo_mode: isDemo,
          date_time: formatDateTimeLocal(log.sent_at),
          raw_sent_at: log.sent_at,
          created_at: log.created_at
        };
      });

      setMessages(transformedMessages); // Store ALL messages regardless of grade
      
    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching SMS logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs when date changes OR on initial mount
  useEffect(() => {
    fetchSMSLogs('all', selectedDate);
  }, [selectedDate]); // Only re-fetch when selectedDate changes

  // Filter messages by grade, section, and search term
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    
    // Apply grade filter
    if (currentClass !== 'all') {
      filtered = filtered.filter(message => message.grade === currentClass);
    }
    
    // Apply section filter
    if (selectedSection) {
      filtered = filtered.filter(message => message.section === selectedSection);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(message => 
        message.guardian_name?.toLowerCase().includes(searchLower) ||
        message.guardian_first_name?.toLowerCase().includes(searchLower) ||
        message.guardian_last_name?.toLowerCase().includes(searchLower) ||
        message.student_name?.toLowerCase().includes(searchLower) ||
        message.student_first_name?.toLowerCase().includes(searchLower) ||
        message.student_last_name?.toLowerCase().includes(searchLower) ||
        message.student_lrn?.toLowerCase().includes(searchLower) ||
        message.message?.toLowerCase().includes(searchLower) ||
        message.grade?.toString().includes(searchLower) ||
        message.section?.toLowerCase().includes(searchLower) ||
        message.phone_number?.toLowerCase().includes(searchLower) ||
        message.formatted_phone?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [messages, currentClass, selectedSection, searchTerm]);

  const handleClassChange = (className) => {
    setCurrentClass(className);
    if (onSectionSelect) {
      onSectionSelect('');
    }
    if (onGradeUpdate) {
      onGradeUpdate(className);
    }
    toggleRow(null);
  };

  const handleRowClick = (messageId, e) => {
    toggleRow(messageId);
  };

  const handleSectionFilter = (section) => {
    if (onSectionSelect) {
      onSectionSelect(section);
    }
  };

  const getTableInfoMessage = () => {
    const messageCount = filteredMessages.length;
    const totalMessageCount = messages.length;
    
    let message = '';
    
    if (currentClass === 'all') {
      message = `Showing ${messageCount} of ${totalMessageCount} SMS message/s`;
    } else {
      message = `Showing ${messageCount} SMS message/s in Grade ${currentClass}`;
    }
    
    // Add date filter info
    if (selectedDate) {
      const dateObj = new Date(selectedDate + 'T00:00:00Z');
      const phDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
      const formattedDate = phDate.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      message += ` on ${formattedDate}`;
    }
    
    // Add section filter info
    if (selectedSection) {
      message += `, Section ${selectedSection}`;
    }
    
    // Add search info
    if (searchTerm.trim()) {
      message += ` matching "${searchTerm}"`;
    }
    
    return message;
  };

  const renderExpandedRow = (message) => {
    const isDemo = message.demo_mode;
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(message.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="6">
          <div 
            className={`${styles.messageCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.messageHeader}>
              SMS Message Details
            </div>
          
            <div className={styles.details}>
              <div>
                <div className={styles.messageInfo}>
                  <strong>Guardian Information</strong>
                </div>
                <div className={styles.messageInfo}>
                  First Name: {message.guardian_first_name || 'N/A'}
                </div>
                <div className={styles.messageInfo}>
                  Middle Name: {message.guardian_middle_name || 'N/A'}
                </div>
                <div className={styles.messageInfo}>
                  Last Name: {message.guardian_last_name || 'N/A'}
                </div>
                <div className={styles.messageInfo}>
                  Phone: {message.formatted_phone}
                </div>
              </div>

              <div>
                <div className={styles.messageInfo}>
                  <strong>Student Information</strong>
                </div>
                <div className={styles.messageInfo}>
                  First Name: {message.student_first_name || 'N/A'}
                </div>
                <div className={styles.messageInfo}>
                  Last Name: {message.student_last_name || 'N/A'}
                </div>
                <div className={styles.messageInfo}>
                  LRN: {message.student_lrn}
                </div>
                <div className={styles.messageInfo}>
                  Grade & Section: {message.grade} - {message.section}
                </div>
              </div>

              <div>
                <div className={styles.messageInfo}>
                  <strong>Message Details</strong>
                </div>
                <div className={styles.messageInfo}>
                  Scan Type: {message.scan_type.toUpperCase()}
                </div>
                
                {/* Show demo indicator if it's a demo message */}
                {isDemo && (
                  <div className={styles.messageInfo}>
                    <span style={{ color: '#666', fontStyle: 'italic' }}>
                      DEMO MESSAGE - No actual SMS was sent
                    </span>
                  </div>
                )}
                
                {/* Only show provider info if not demo */}
                {!isDemo && (
                  <>
                    <div className={styles.messageInfo}>
                      Provider: {message.provider}
                    </div>
                    <div className={styles.messageInfo}>
                      Cost: {message.cost}
                    </div>
                  </>
                )}
                
                {/* Only show reason if it's not a demo message */}
                {message.reason !== 'N/A' && !isDemo && (
                  <div className={styles.messageInfo}>
                    Reason: {message.reason}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.fullMessage}>
              <div className={styles.messageInfo}>
                <strong>Full Message:</strong>
              </div>
              <div className={styles.messageText}>
                {message.message}
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderRegularRow = (message, rowColorClass, visibleRowIndex) => {
    const truncatedMessage = message.message.length > 50 
      ? `${message.message.substring(0, 50)}...` 
      : message.message;

    return (
      <tr 
        className={`${styles.studentRow} ${rowColorClass}`}
        onClick={(e) => handleRowClick(message.id, e)}
      >
        <td>
          <div className={styles.guardianCell}>
            <div>{message.guardian_name}</div>
            <small style={{ color: '#666' }}>{message.formatted_phone}</small>
          </div>
        </td>
        <td>
          <div className={styles.studentCell}>
            <div>{message.student_name}</div>
            <small style={{ color: '#666' }}>LRN: {message.student_lrn}</small>
          </div>
        </td>
        <td>{message.grade}</td>
        <td>{message.section}</td>
        <td>
          <div className={styles.messageCell}>
            <div>{truncatedMessage}</div>
          </div>
        </td>
        <td>{message.date_time}</td>
      </tr>
    );
  };

  const grades = ['all', '7', '8', '9', '10'];

  if (loading || parentLoading) {
    return (
      <div className={styles.messageTableContainer}>
        <div className={styles.loading}>Loading SMS logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.messageTableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.messageTableContainer} ref={tableRef}>
      <div className={styles.messageTable}>
        <div className={styles.classContainers}>
          {grades.map(grade => (
            <Button 
              key={grade}
              label={grade === 'all' ? 'All' : `Grade ${grade}`}
              tabBottom={true}
              height="xs"
              width="xs-sm"
              color="grades"
              active={currentClass === grade}
              onClick={() => handleClassChange(grade)}
            >
              {grade === 'all' ? 'All' : `Grade ${grade}`}
            </Button>
          ))}

          <div className={styles.tableInfo}>
            <p>{getTableInfoMessage()}</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.messagesTable}>
            <thead>
              <tr>
                <th>GUARDIAN</th>
                <th>STUDENT</th>
                <th>GRADE</th>
                <th>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderRow}>
                      <span>SECTION</span>
                      <SectionDropdown 
                        availableSections={availableSectionsLocal}
                        selectedValue={selectedSection}
                        onSelect={handleSectionFilter}
                      />
                    </div>
                  </div>
                </th>
                <th>MESSAGE</th>
                <th>DATE & TIME</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.noMessage}>
                    {getTableInfoMessage()}
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message, index) => {
                  const rowColorClass = index % 2 === 0 ? styles.rowEven : styles.rowOdd;
                  
                  return (
                    <React.Fragment key={message.id}>
                      {!isRowExpanded(message.id) && (
                        renderRegularRow(message, rowColorClass, index)
                      )}
                      {renderExpandedRow(message)}
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

export default MessageTable;