// DeleteEntityModal.jsx
import Modal from '../Modal/Modal.jsx';
import styles from './DeleteEntityModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx';
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import EntityList from '../../List/EntityList/EntityList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function DeleteEntityModal({ 
  isOpen, 
  onClose, 
  entity, // For single deletion
  selectedEntities = [], // For bulk deletion
  entityData = [], // For bulk deletion to show names
  onConfirm,
  onConfirmBulk,
  entityType = 'entity', // 'student', 'teacher', 'subject', etc.
  entityConfig = {},
  currentFilter = '',
  currentSection = '',
  currentGrade = ''
}) {
  const { info, error: toastError } = useToast(); 
  
  const isBulkDelete = selectedEntities.length > 0;
  const deleteCount = isBulkDelete ? selectedEntities.length : 1;
  
  // Don't render anything if modal is not open OR if it's bulk delete but no entities selected
  if (!isOpen) return null;
  if (!isBulkDelete && !entity) return null; 

  // Get config for this entity type
  const config = {
    // Default config (for generic entities)
    warningMessage: 'This action cannot be undone.',
    hasAccountField: false,
    hasQRCode: false,
    hasContextInfo: false,
    
    // Override with entity-specific config
    ...getEntityConfig(entityType),
    ...entityConfig
  };

  // Get selected entity objects
  const selectedEntityObjects = isBulkDelete 
    ? selectedEntities
        .map(entityId => entityData.find(e => e.id === entityId))
        .filter(entity => entity !== undefined)
    : [entity];

  // Check if any entities have accounts (if applicable)
  const hasAccounts = config.hasAccountField && 
    selectedEntityObjects.some(entity => 
      entity.status === 'pending' || entity.status === 'active' || entity.status === 'inactive'
    );

  const getWarningMessage = () => {
    let warning = config.warningMessage;
    
    if (hasAccounts && config.hasAccountField) {
      warning = `This will permanently delete ${entityType} data and ${entityType}${deleteCount > 1 ? 's' : ''} who have accounts.`;
    } else if (config.hasQRCode) {
      warning = `This action cannot be undone. All ${entityType} data, including QR codes, will be permanently removed.`;
    }
    
    return warning;
  };

  const getStatusMessage = () => {
    if (!config.hasAccountField) return null;
    
    const statuses = selectedEntityObjects.map(e => e.status || 'no status');
    const uniqueStatuses = [...new Set(statuses)];
    
    if (uniqueStatuses.length === 1) {
      const status = uniqueStatuses[0];
      if (status === 'pending') return `${entityType}${deleteCount > 1 ? 's have' : ' has'} pending invitations.`;
      if (status === 'active') return `${entityType}${deleteCount > 1 ? 's have' : ' has'} active accounts.`;
      if (status === 'inactive') return `${entityType}${deleteCount > 1 ? 's have' : ' has'} inactive accounts.`;
      return `${entityType}${deleteCount > 1 ? 's have' : ' has'} no accounts yet.`;
    } else {
      return `Selected ${entityType}s have various account statuses.`;
    }
  };

  const handleConfirm = async () => {
    try {
      if (isBulkDelete) {
        await onConfirmBulk?.(selectedEntities);
        info(`${deleteCount} ${entityType}${deleteCount !== 1 ? 's' : ''} successfully deleted`);
      } else {
        await onConfirm?.(entity.id);
        info(`${deleteCount} ${entityType} successfully deleted`);
      }
      onClose();
    } catch (error) {
      console.error('Error in deletion:', error);
      toastError(`Failed to delete ${entityType}: ${error.message}`);
      onClose();
    }
  };

  const getContextDescription = () => {
    if (!config.hasContextInfo) return '';
    
    if (currentSection) {
      return `from Section ${currentSection}`;
    }
    if (currentFilter) {
      return `matching "${currentFilter}"`;
    }
    return currentGrade ? `from Grade ${currentGrade}` : '';
  };

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          {isBulkDelete 
            ? `Delete ${deleteCount} Selected ${capitalizeFirstLetter(entityType)}${deleteCount > 1 ? 's' : ''}` 
            : `Delete ${capitalizeFirstLetter(entityType)}`}
        </TitleModalLabel>
        
        <MessageModalLabel>
          {isBulkDelete ? (
            `Are you sure you want to delete ${deleteCount} ${entityType}${deleteCount !== 1 ? 's' : ''} ${getContextDescription()}?`
          ) : (
            `Are you sure you want to delete this ${entityType}?`
          )}
        </MessageModalLabel>
        
        {config.hasAccountField && getStatusMessage() && (
          <InfoBox type="important">
            <strong>Status:</strong> {getStatusMessage()}
          </InfoBox>
        )}
        
        <EntityList 
          entities={selectedEntityObjects}
          variant={isBulkDelete ? "multiple" : "single"}
          title={`${capitalizeFirstLetter(entityType)}${deleteCount > 1 ? 's' : ''} to be deleted`}
          entityType={entityType}
        />

        <InfoBox type="warning">
          <strong>Warning:</strong> {getWarningMessage()}
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label="Delete"
            color="danger"
            onClick={handleConfirm}
            width="xs"
            height="sm"
            disabled={isBulkDelete && selectedEntities.length === 0}
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

// Helper function to get entity-specific config
function getEntityConfig(entityType) {
  const configs = {
    student: {
      warningMessage: 'This action cannot be undone. All student data, including QR codes, will be permanently removed.',
      hasAccountField: false,
      hasQRCode: true,
      hasContextInfo: true
    },
    teacher: {
      warningMessage: 'This will permanently delete teacher data from the system.',
      hasAccountField: true,
      hasQRCode: false,
      hasContextInfo: false
    },
    subject: {
      warningMessage: 'This will permanently delete the subject from the system.',
      hasAccountField: false,
      hasQRCode: false,
      hasContextInfo: false
    },
    gradeSection: {
      warningMessage: 'This will permanently delete the grade section from the system.',
      hasAccountField: false,
      hasQRCode: false,
      hasContextInfo: false
    }
  };
  
  return configs[entityType] || configs.entity;
}

// Helper function
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default DeleteEntityModal;