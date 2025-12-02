import Modal from '../Modal/Modal.jsx';
import styles from './QRCodeUpdateWarningModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { formatGradeSection } from '../../../Utils/Formatters.js'; 
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import StudentList from '../../List/StudentList/StudentList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function QRCodeUpdateWarningModal({ isOpen, onClose, student, onConfirm }) {
  if (!student) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>Update Student Information</TitleModalLabel>
        
        <MessageModalLabel >
          You are about to update this student's information.
        </MessageModalLabel>
        
        <StudentList 
            students={[student]}
            variant="single"
            title="Student to be editted"
        />

        <InfoBox type="important">
        <strong>Important:</strong> This will generate a new QR code for this student. Any previously issued QR codes will no longer work for attendance tracking.
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label="Yes, Update Student"
            color="warning"
            onClick={handleConfirm}
            width="lg"
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

export default QRCodeUpdateWarningModal;