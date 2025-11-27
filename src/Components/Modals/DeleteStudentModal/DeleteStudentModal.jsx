import Modal from '../Modal/Modal.jsx';
import styles from './DeleteStudentModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';

function DeleteStudentModal({ isOpen, onClose, student, onConfirm }) {
  // Don't do early return here - let Modal handle the animation
  if (!student) return null; // Only return null if student is null

  const handleConfirm = () => {
    onConfirm(student.id);
    onClose();
  };

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <h2 className={styles.title}>Delete Student</h2>
        
        <div className={styles.message}>
          Are you sure you want to delete this student?
        </div>
        
        <div className={styles.studentInfo}>
          <strong>{student.student_id} | {student.first_name} {student.last_name} | Grade {student.grade}- {student.section}</strong>
        </div>

        <div className={styles.warning}>
          This action cannot be undone.
        </div>

        <div className={styles.buttonGroup}>
          <Button
            label="Delete"
            color="danger"
            onClick={handleConfirm}
            width="sm"
            height="sm"
          />
          <Button 
            label="Cancel"
            color="ghost"
            onClick={onClose}
            width="sm"
            height="sm"
          />
        </div>
      </div>
    </Modal>
  );
}

export default DeleteStudentModal;