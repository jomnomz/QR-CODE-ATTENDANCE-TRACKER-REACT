import Modal from '../Modal/Modal.jsx';
import styles from './DeleteStudentModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { formatGradeSection, formatStudentName } from '../../../Utils/Formatters.js';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx'; 
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import StudentList from '../../List/StudentList/StudentList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function DeleteStudentModal({ 
  isOpen, 
  onClose, 
  student, // For single deletion
  selectedStudents = [], // For bulk deletion
  studentData = [], // For bulk deletion to show names
  onConfirm,
  onConfirmBulk,
  currentFilter = '',
  currentSection = '',
  currentGrade = ''
}) {
  const { info } = useToast(); 
  
  const isBulkDelete = selectedStudents.length > 0;
  const deleteCount = isBulkDelete ? selectedStudents.length : 1;
  
  // Don't render anything if modal is not open OR if it's bulk delete but no students selected
  if (!isOpen) return null;
  if (!isBulkDelete && !student) return null; 

  const handleConfirm = async () => {
    try {
      if (isBulkDelete) {
        await onConfirmBulk?.(selectedStudents);
        info(`${deleteCount} student${deleteCount !== 1 ? 's' : ''} successfully deleted`);
      } else {
        await onConfirm?.(student.id);
        info('1 student successfully deleted');
      }
      onClose();
    } catch (error) {
      console.error('Error in deletion:', error);
      onClose();
    }
  };

  const getContextDescription = () => {
    if (currentSection) {
      return `from Section ${currentSection}`;
    }
    if (currentFilter) {
      return `matching "${currentFilter}"`;
    }
    return `from Grade ${currentGrade}`;
  };

  // Get actual student objects from IDs
  const selectedStudentObjects = isBulkDelete 
    ? selectedStudents
        .map(studentId => studentData.find(s => s.id === studentId))
        .filter(student => student !== undefined)
    : [];

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          {isBulkDelete ? `Delete ${deleteCount} Selected Students` : 'Delete Student'}
        </TitleModalLabel>
        
        <MessageModalLabel >
          {isBulkDelete ? (
            `Are you sure you want to delete ${deleteCount} student${deleteCount !== 1 ? 's' : ''} ${getContextDescription()}?`
          ) : (
            'Are you sure you want to delete this student?'
          )}
        </MessageModalLabel>
        
        {isBulkDelete ? (
          <StudentList 
            students={selectedStudentObjects}
            variant="multiple"
            title="Students to be deleted"
          />
        ) : (
          <StudentList 
            students={[student]}
            variant="single"
            title="Student to be deleted"
          />
        )}

        <InfoBox type="warning">
          <strong>Warning:</strong> This action cannot be undone. All student data, including QR codes, will be permanently removed.
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label="Delete"
            color="danger"
            onClick={handleConfirm}
            width="xs"
            height="sm"
            disabled={isBulkDelete && selectedStudents.length === 0}
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

export default DeleteStudentModal