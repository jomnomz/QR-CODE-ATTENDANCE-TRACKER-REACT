// components/Teachers/InviteModal/InviteModal.jsx
import { useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import styles from './InviteModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx'; 
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import EntityList from '../../List/EntityList/EntityList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function InviteModal({ 
  isOpen, 
  onClose, 
  teacher, // For single invitation
  selectedTeachers = [], // For bulk invitation
  teacherData = [], // For bulk invitation to show names
  onConfirm,
  onConfirmBulk
}) {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  
  const isBulkInvite = selectedTeachers.length > 0;
  const inviteCount = isBulkInvite ? selectedTeachers.length : 1;
  
  // Don't render anything if modal is not open OR if it's bulk invite but no teachers selected
  if (!isOpen) return null;
  if (!isBulkInvite && !teacher) return null;

  // Filter out teachers who already have accounts or are already invited
  const filterEligibleTeachers = (teachers) => {
    return teachers.filter(t => {
      if (!t.email_address) return false; // Skip teachers without email
      if (t.status === 'active') return false; // Already have account
      if (t.status === 'pending') return false; // Already invited
      if (t.status === 'inactive') return false; // Account suspended
      return true;
    });
  };

  // Get actual teacher objects from IDs
  const selectedTeacherObjects = isBulkInvite 
    ? selectedTeachers
        .map(teacherId => teacherData.find(t => t.id === teacherId))
        .filter(teacher => teacher !== undefined)
    : [];

  const eligibleTeachers = filterEligibleTeachers(isBulkInvite ? selectedTeacherObjects : [teacher]);
  const ineligibleCount = inviteCount - eligibleTeachers.length;

  const handleConfirm = async () => {
    setLoading(true);
    
    try {
      if (isBulkInvite) {
        if (eligibleTeachers.length === 0) {
          error('No eligible teachers to invite');
          onClose();
          return;
        }
        
        await onConfirmBulk?.(eligibleTeachers.map(t => t.id));
        success(`${eligibleTeachers.length} invitation${eligibleTeachers.length !== 1 ? 's' : ''} sent successfully`);
      } else {
        if (eligibleTeachers.length === 0) {
          error('Teacher is not eligible for invitation');
          onClose();
          return;
        }
        
        await onConfirm?.(teacher.id);
        success('Invitation sent successfully');
      }
      onClose();
    } catch (err) {
      error(err.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          {isBulkInvite ? `Send Invitations to ${inviteCount} Teachers` : 'Send Invitation'}
        </TitleModalLabel>
        
        <MessageModalLabel>
          {isBulkInvite ? (
            `You are about to send account invitations to ${eligibleTeachers.length} teacher${eligibleTeachers.length !== 1 ? 's' : ''}.`
          ) : (
            'You are about to send an account invitation to this teacher:'
          )}
        </MessageModalLabel>
        
        {isBulkInvite ? (
          <>
            {eligibleTeachers.length > 0 && (
              <EntityList 
                entities={eligibleTeachers}
                variant="multiple"
                title="Teachers who will receive invitations"
                entityType="teacher"
              />
            )}
            
            {ineligibleCount > 0 && (
              <InfoBox type="info">
                <strong>Note:</strong> {ineligibleCount} teacher{ineligibleCount !== 1 ? 's' : ''} will not receive invitations because they already have accounts or are not eligible.
              </InfoBox>
            )}
          </>
        ) : (
          <EntityList 
            entities={[teacher]}
            variant="single"
            title="Teacher to invite"
            entityType="teacher"
          />
        )}

        <div className={styles.messageSection}>
          <label htmlFor="message">Custom Message (Optional):</label>
          <textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="You can add a personalized message here. The default invitation email will include the necessary setup instructions."
            rows={6}
            className={styles.messageInput}
            disabled={loading}
          />
          <p className={styles.messageHint}>
            Leave blank to use the default invitation message
          </p>
        </div>

        <InfoBox type="note">
          <strong>Note:</strong> Teachers will receive an email with a link to create their account. Once they create an account, their status will automatically change to "Active".
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label={loading ? "Sending..." : isBulkInvite ? `Send ${eligibleTeachers.length} Invitation${eligibleTeachers.length !== 1 ? 's' : ''}` : "Send Invitation"}
            color="primary"
            onClick={handleConfirm}
            width="auto"
            height="sm"
            disabled={loading || eligibleTeachers.length === 0}
          />
          <Button 
            label="Cancel"
            color="ghost"
            onClick={onClose}
            width="sm"
            height="sm"
            disabled={loading}
          />
        </div>
      </div>
    </Modal>
  );
}

export default InviteModal;