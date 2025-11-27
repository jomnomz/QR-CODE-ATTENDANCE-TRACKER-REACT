import styles from './Modal.module.css'
import Button from '../../UI/Buttons/Button/Button.jsx';
import CancelIcon from '@mui/icons-material/Cancel';
import { useEffect, useState } from 'react';

function Modal({ 
  isOpen, 
  onClose, 
  children, 
  size = "md" 
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) return null;

  const sizeMap = {
    xsm: { width: "300px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    sm: { width: "400px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    md: { width: "500px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    lg: { width: "800px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    xl: { width: "1000px", maxWidth: "95vw", height: "auto", maxHeight: "90vh" },
  };

  const sizeStyle = sizeMap[size] || sizeMap.md; 

  return (
    <div 
      className={`${styles.modalBackground} ${isOpen ? styles.backgroundEnter : styles.backgroundExit}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div 
        className={`${styles.modalContainer} ${isOpen ? styles.modalEnter : styles.modalExit}`}
        onClick={(e) => e.stopPropagation()}
        style={sizeStyle}
      >
        <div className={styles.modalHeader}>
          <Button height="exit" width="exit" backgroundNone={true} pill={true} icon={<CancelIcon/>} onClick={onClose} />
        </div>
        <div className={styles.modalContent}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;