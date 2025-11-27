import React, { useState, useEffect, useRef } from 'react';
import { StudentService } from '../../../Utils/SupabaseHelpers';
import { formatStudentName, formatGradeSection, formatDate, formatNA } from '../../../Utils/Formatters';
import { validateStudentData } from '../../../Utils/StudentDataValidation';
import Button from '../../UI/Buttons/Button/Button';
import DeleteStudentModal from '../../Modals/DeleteStudentModal/DeleteStudentModal';
import QRCodeModal from '../../Modals/QRCodeModal/QRCodeModal'; // Add this import
import styles from './StudentTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode, faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";

const StudentTable = () => {
  const [currentClass, setCurrentClass] = useState('7');
  const [expandedRow, setExpandedRow] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false); // Add this state
  const [selectedStudent, setSelectedStudent] = useState(null); // Add this state
  const tableRef = useRef(null);

  useEffect(() => {
    fetchStudents(currentClass);
  }, [currentClass]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (expandedRow && tableRef.current && !tableRef.current.contains(event.target)) {
        setExpandedRow(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedRow]);

  const fetchStudents = async (grade) => {
    try {
      setLoading(true);
      setError(null);
      const data = await StudentService.fetchByGrade(grade);
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setExpandedRow(null);
    setEditingStudent(null);
  };

  const toggleCard = (studentId) => {
    if (expandedRow === studentId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(studentId);
    }
  };

  const handleRowClick = (studentId, e) => {
    if (editingStudent || e.target.closest('.edit-input') || e.target.closest('.action-button')) {
      return;
    }
    toggleCard(studentId);
  };

  const handleQRCodeClick = async (student, e) => {
  e.stopPropagation();
  
  if (!student.qr_verification_token) {
    try {
      setLoading(true);
      const updatedStudent = await StudentService.generateTokenForStudent(student.id);
      setSelectedStudent(updatedStudent);
      setQrModalOpen(true);
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  } else {
    setSelectedStudent(student);
    setQrModalOpen(true);
  }
};

  const handleEditClick = (student, e) => {
    e.stopPropagation();
    setEditingStudent(student.id);
    setEditFormData({
      student_id: student.student_id,
      first_name: student.first_name,
      middle_name: student.middle_name,
      last_name: student.last_name,
      grade: student.grade,
      section: student.section,
      email: student.email,
      phone_number: student.phone_number
    });
    setExpandedRow(null);
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingStudent(null);
    setEditFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInputClick = (e) => {
    e.stopPropagation();
  };

  const handleSaveEdit = async (studentId, e) => {
    if (e) e.stopPropagation();
    
    try {
      setSaving(true);
      
      const errors = validateStudentData(editFormData);
      if (Object.keys(errors).length > 0) {
        setError('Please fix validation errors: ' + Object.values(errors).join(', '));
        return;
      }

      const updatedStudent = await StudentService.updateStudent(studentId, editFormData);
      
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId ? updatedStudent : student
        )
      );

      setEditingStudent(null);
      setEditFormData({});
      setError(null);
      
    } catch (err) {
      console.error('Error updating student:', err);
      setError('Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (student, e) => {
    e.stopPropagation();
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (studentId) => {
    try {
      await StudentService.deleteStudent(studentId);
      setStudents(prevStudents => 
        prevStudents.filter(student => student.id !== studentId)
      );
    } catch (err) {
      console.error('Error deleting student:', err);
      setError('Failed to delete student');
    }
  };

  const grades = ['7', '8', '9', '10', '11', '12'];

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
              <p>Showing {students.length} student/s in Grade {currentClass}</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.studentsTable}>
            <thead>
              <tr>
                <th>ID.NO</th>
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
              {students.length === 0 ? (
                <tr>
                  <td colSpan="11" className={styles.noStudents}>
                    No students found in Grade {currentClass}
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <React.Fragment key={student.id}>
                    <tr 
                      className={`${styles.studentRow} ${expandedRow === student.id ? styles.hiddenRow : ''} ${editingStudent === student.id ? styles.editingRow : ''}`}
                      onClick={(e) => handleRowClick(student.id, e)}
                    >
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="student_id"
                            value={editFormData.student_id || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          student.student_id
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="first_name"
                            value={editFormData.first_name || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          student.first_name
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="middle_name"
                            value={editFormData.middle_name || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          student.middle_name
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="last_name"
                            value={editFormData.last_name || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          student.last_name
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="grade"
                            value={editFormData.grade || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          student.grade
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="section"
                            value={editFormData.section || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          student.section
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="email"
                            name="email"
                            value={editFormData.email || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          formatNA(student.email)
                        )}
                      </td>
                      <td>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            name="phone_number"
                            value={editFormData.phone_number || ''}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            className={`${styles.editInput} edit-input`}
                          />
                        ) : (
                          formatNA(student.phone_number)
                        )}
                      </td>
                      <td>
                        <div className={styles.icon}>
                          <FontAwesomeIcon 
                            icon={faQrcode} 
                            onClick={(e) => handleQRCodeClick(student, e)} // Updated this line
                            className="action-button"
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.editCell}>
                          {editingStudent === student.id ? (
                            <div className={`${styles.editActions} action-button`}>
                              <button 
                                onClick={(e) => handleSaveEdit(student.id, e)}
                                disabled={saving}
                                className={styles.saveBtn}
                              >
                                Save
                              </button>
                              <button 
                                onClick={handleCancelEdit}
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
                                onClick={(e) => handleEditClick(student, e)}
                                className="action-button"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={styles.icon}>
                          <FontAwesomeIcon 
                            icon={faTrashCan} 
                            className="action-button"
                            onClick={(e) => handleDeleteClick(student, e)}
                          />
                        </div>
                      </td>
                    </tr>
                    
                    {expandedRow === student.id && (
                      <tr className={styles.expandRow}>
                        <td colSpan="11">
                          <div 
                            className={`${styles.studentCard} ${styles.expand} ${styles.show}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={styles.studentHeader}>
                              {formatStudentName(student)}
                            </div>
                            <div className={styles.studentInfo}>
                              <strong>Student Details</strong>
                            </div>
                            <div className={styles.studentInfo}>Student ID: {student.student_id}</div>
                            <div className={styles.studentInfo}>Grade & Section: {formatGradeSection(student)}</div>
                            <div className={styles.studentInfo}>Full Name: {formatStudentName(student)}</div>
                            <div className={styles.studentInfo}>Email: {formatNA(student.email)}</div>
                            <div className={styles.studentInfo}>Phone: {formatNA(student.phone_number)}</div>
                            <div className={styles.studentInfo}>
                              Added: {formatDate(student.created_at)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteStudentModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        student={studentToDelete}
        onConfirm={handleConfirmDelete}
      />

      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
};

export default StudentTable;