import styles from './ActionsDropdownButton.module.css';
import { useState, useRef, useEffect } from 'react';

function ActionsDropdownButton({ 
  selectedCount = 0,
  currentFilter = '',
  currentSection = '',
  currentGrade = '',
  onDeleteSelected,
  onPromoteSelected,
  onMoveSelected,
  onDownloadQR // RENAMED HANDLER
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const hasSelection = selectedCount > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getActionDescription = () => {
    if (!hasSelection) {
      return 'No students selected';
    }
    
    if (currentSection) {
      return `${selectedCount} student${selectedCount !== 1 ? 's' : ''} selected from Section ${currentSection}`;
    }
    
    if (currentFilter) {
      return `${selectedCount} student${selectedCount !== 1 ? 's' : ''} selected matching "${currentFilter}"`;
    }
    
    return `${selectedCount} student${selectedCount !== 1 ? 's' : ''} selected from Grade ${currentGrade}`;
  };

  const handleDelete = () => {
    if (hasSelection) {
      onDeleteSelected?.(selectedCount, getActionDescription());
    }
    setIsOpen(false);
  };

  const handlePromote = () => {
    if (hasSelection) {
      onPromoteSelected?.(selectedCount, getActionDescription());
    }
    setIsOpen(false);
  };

  const handleMove = () => {
    if (hasSelection) {
      onMoveSelected?.(selectedCount, getActionDescription());
    }
    setIsOpen(false);
  };

  const handleDownloadQR = () => {
    if (hasSelection) {
      onDownloadQR?.(selectedCount, getActionDescription());
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button 
        className={`${styles.dropdownButton} ${!hasSelection ? styles.disabledButton : ''}`}
        onClick={() => hasSelection && setIsOpen(!isOpen)}
        disabled={!hasSelection}
      >
        Actions
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>
          {isOpen ? '▲' : '▲'}
        </span>
      </button>
      
      {isOpen && hasSelection && (
        <div className={styles.dropdownMenu}>

          {/* Delete Action */}
          <div 
            className={styles.dropdownItem}
            onClick={handleDelete}
          >
            <div className={styles.actionText}>
              Delete Selected
              <span className={styles.actionCount}>
                ({selectedCount})
              </span>
            </div>
          </div>

          {/* Promote Action */}
          <div 
            className={styles.dropdownItem}
            onClick={handlePromote}
          >
            <div className={styles.actionText}>
              Promote Selected
              <span className={styles.actionCount}>
                ({selectedCount})
              </span>
            </div>
          </div>

          {/* Move Action */}
          <div 
            className={styles.dropdownItem}
            onClick={handleMove}
          >
            <div className={styles.actionText}>
              Move Selected to Section...
              <span className={styles.actionCount}>
                ({selectedCount})
              </span>
            </div>
          </div>

          {/* Download QR Codes */}
          <div 
            className={styles.dropdownItem}
            onClick={handleDownloadQR}
          >
            <div className={styles.actionText}>
              Download Selected QR Codes
              <span className={styles.actionCount}>
                ({selectedCount})
              </span>
            </div>
          </div>

          {/* Action Description */}
          <div className={styles.actionDescription}>
            {getActionDescription()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionsDropdownButton;