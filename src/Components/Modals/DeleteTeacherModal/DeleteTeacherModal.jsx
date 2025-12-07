import Modal from '../Modal/Modal.jsx';
import styles from './DeleteTeacherModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx';
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import EntityList from '../../List/EntityList/EntityList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function DeleteTeacherModal({ 
  isOpen, 
  onClose, 
  teacher, // For single deletion
  selectedTeachers = [], // For bulk deletion
  teacherData = [], // For bulk deletion to show names
  onConfirm,
  onConfirmBulk,
  currentFilter = ''
}) {
  const { info } = useToast(); 
  
  const isBulkDelete = selectedTeachers.length > 0;
  const deleteCount = isBulkDelete ? selectedTeachers.length : 1;
  
  // Don't render anything if modal is not open OR if it's bulk delete but no teachers selected
  if (!isOpen) return null;
  if (!isBulkDelete && !teacher) return null; 

  const handleConfirm = async () => {
    try {
      if (isBulkDelete) {
        await onConfirmBulk?.(selectedTeachers);
        info(`${deleteCount} teacher${deleteCount !== 1 ? 's' : ''} successfully deleted`);
      } else {
        await onConfirm?.(teacher.id);
        info('1 teacher successfully deleted');
      }
      onClose();
    } catch (error) {
      console.error('Error in deletion:', error);
      onClose();
    }
  };

  const getContextDescription = () => {
    if (currentFilter) {
      return `matching "${currentFilter}"`;
    }
    return 'from the system';
  };

  // Get actual teacher objects from IDs
  const selectedTeacherObjects = isBulkDelete 
    ? selectedTeachers
        .map(teacherId => teacherData.find(t => t.id === teacherId))
        .filter(teacher => teacher !== undefined)
    : [];

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          {isBulkDelete ? `Delete ${deleteCount} Selected Teachers` : 'Delete Teacher'}
        </TitleModalLabel>
        
        <MessageModalLabel>
          {isBulkDelete ? (
            `Are you sure you want to delete ${deleteCount} teacher${deleteCount !== 1 ? 's' : ''} ${getContextDescription()}?`
          ) : (
            'Are you sure you want to delete this teacher?'
          )}
        </MessageModalLabel>
        
        {isBulkDelete ? (
          <EntityList 
            entities={selectedTeacherObjects}
            variant="multiple"
            title="Teachers to be deleted"
            entityType="teacher"
          />
        ) : (
          <EntityList 
            entities={[teacher]}
            variant="single"
            title="Teacher to be deleted"
            entityType="teacher"
          />
        )}

        <InfoBox type="warning">
          <strong>Warning:</strong> This action cannot be undone. All teacher data will be permanently removed.
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label="Delete"
            color="danger"
            onClick={handleConfirm}
            width="xs"
            height="sm"
            disabled={isBulkDelete && selectedTeachers.length === 0}
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

export default DeleteTeacherModal;