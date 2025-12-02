import { useState } from 'react';
import { StudentService } from '../../Utils/EntityService';

export const useStudentActions = (setStudents) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (studentId) => {
    try {
      console.log('🔄 Deleting student ID:', studentId);
      
      await StudentService.deleteStudent(studentId);
      
      setStudents(prevStudents => {
        const updatedStudents = prevStudents.filter(student => student.id !== studentId);
        console.log('✅ Students after deletion:', updatedStudents.length);
        return updatedStudents;
      });
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting student:', err);
      return { 
        success: false, 
        error: err.message || 'Failed to delete student' 
      };
    }
  };

  const handleQRCodeClick = async (student) => {
    try {
      setLoading(true);
      
      if (!student.qr_verification_token) {
        console.log('🔄 Generating QR token for student:', student.id);
        const updatedStudent = await StudentService.generateTokenForStudent(student.id);
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
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setStudentToDelete(null);
  };

  const closeQRModal = () => {
    setQrModalOpen(false);
    setSelectedStudent(null);
  };

  return {
    deleteModalOpen,
    setDeleteModalOpen: closeDeleteModal,
    studentToDelete,
    qrModalOpen,
    setQrModalOpen: closeQRModal,
    selectedStudent,
    loading,
    handleDeleteClick,
    handleConfirmDelete,
    handleQRCodeClick
  };
};