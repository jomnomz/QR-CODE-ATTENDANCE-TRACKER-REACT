import { useState } from 'react';
import { StudentService, TeacherService } from '../../Utils/EntityService';

// Base entity actions hook
const useBaseEntityActions = (entityType) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteClick = (entity) => {
    setEntityToDelete(entity);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (entityId, deleteFunction) => {
    try {
      setLoading(true);
      await deleteFunction(entityId);
      return { success: true };
    } catch (err) {
      console.error(`❌ Error deleting ${entityType}:`, err);
      return { 
        success: false, 
        error: err.message || `Failed to delete ${entityType}` 
      };
    } finally {
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setEntityToDelete(null);
  };

  return {
    deleteModalOpen,
    setDeleteModalOpen: closeDeleteModal,
    entityToDelete,
    loading,
    handleDeleteClick,
    handleConfirmDelete
  };
};

// Student-specific actions
export const useStudentActions = (setStudents) => {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const baseActions = useBaseEntityActions('student');

  const handleQRCodeClick = async (student) => {
    try {
      baseActions.loading = true;
      
      const studentService = new StudentService();
      
      if (!student.qr_verification_token) {
        console.log('🔄 Generating QR token for student:', student.id);
        const updatedStudent = await studentService.generateTokenForStudent(student.id);
        setSelectedStudent(updatedStudent);
      } else {
        setSelectedStudent(student);
      }
      
      setQrModalOpen(true);
      return { success: true };
      
    } catch (err) {
      console.error('❌ Error with QR code:', err);
      return { 
        success: false, 
        error: err.message || 'Failed to generate QR code' 
      };
    } finally {
      baseActions.loading = false;
    }
  };

  const handleConfirmStudentDelete = async (studentId) => {
    const studentService = new StudentService();
    const result = await baseActions.handleConfirmDelete(studentId, (id) => studentService.delete(id));
    
    if (result.success) {
      setStudents(prev => prev.filter(student => student.id !== studentId));
    }
    
    return result;
  };

  const closeQRModal = () => {
    setQrModalOpen(false);
    setSelectedStudent(null);
  };

  return {
    ...baseActions,
    qrModalOpen,
    setQrModalOpen: closeQRModal,
    selectedStudent,
    handleQRCodeClick,
    handleConfirmDelete: handleConfirmStudentDelete
  };
};

// Teacher-specific actions
export const useTeacherActions = (setTeachers) => {
  const baseActions = useBaseEntityActions('teacher');

  const handleConfirmTeacherDelete = async (teacherId) => {
    const teacherService = new TeacherService();
    const result = await baseActions.handleConfirmDelete(teacherId, (id) => teacherService.delete(id));
    
    if (result.success) {
      setTeachers(prev => prev.filter(teacher => teacher.id !== teacherId));
    }
    
    return result;
  };

  return {
    ...baseActions,
    handleConfirmDelete: handleConfirmTeacherDelete
  };
};