import styles from './DropDownButton.module.css';
import { useState, useRef, useEffect } from 'react';

function DropDownButton({ options = [], selectedValue, onSelect, placeholder = "Select section" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSelect = (value) => {
    onSelect(value);
    setIsOpen(false);
  };

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

  const uniqueOptions = Array.isArray(options) 
    ? [...new Set(options.filter(option => option != null && option !== ''))] 
    : [];

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button 
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedValue || placeholder}
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>
          {isOpen ? '▲' : '▲'}
        </span>
      </button>
      
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div 
            className={styles.dropdownItem}
            onClick={() => handleSelect('')}
          >
            All Sections
          </div>
          {uniqueOptions.map((option) => (
            <div
              key={option}
              className={styles.dropdownItem}
              onClick={() => handleSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DropDownButton;