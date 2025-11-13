import styles from './Modal.module.css'
import ExitButton from "../../UI/Buttons/ExitButton/ExitButton.jsx";

function Modal({ 
  isOpen, 
  onClose, 
  children, 
  size = "md" // default size variant
}) {
  if (!isOpen) return null;

  // Define reusable size variants
  const sizeMap = {
    sm: { width: "300px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    md: { width: "500px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    lg: { width: "800px", maxWidth: "90vw", height: "auto", maxHeight: "90vh" },
    xl: { width: "1000px", maxWidth: "95vw", height: "auto", maxHeight: "90vh" },
  };

  const sizeStyle = sizeMap[size] || sizeMap.md; // fallback to md if unknown

  return (
    <div className={styles.modalBackground} onClick={onClose}>
      <div 
        className={styles.modalContainer} 
        onClick={(e) => e.stopPropagation()}
        style={sizeStyle}
      >
        <div className={styles.modalHeader}>
          <ExitButton onClick={onClose} />
        </div>
        <div className={styles.modalContent}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;