import React, { useEffect } from 'react';
import styles from './Toast.module.css';

function Toast({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose, 
  position = 'top-right' 
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]} ${styles[position]}`}>
      <span className={styles.message}>{message}</span>
      <button className={styles.closeButton} onClick={onClose}>×</button>
    </div>
  );
}

export default Toast;