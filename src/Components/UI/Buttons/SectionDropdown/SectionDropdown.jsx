import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styles from './SectionDropdown.module.css';

function SectionDropdown({ 
  availableSections = [], 
  selectedValue, 
  onSelect,
  maxHeight = 300 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: maxHeight });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleSelect = (value) => {
    onSelect(value);
    setIsOpen(false);
  };

  // Calculate dropdown position and maximum height
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      
      // Calculate available space for dropdown (leave some margin)
      let calculatedHeight = Math.min(maxHeight, spaceBelow - 20); // 20px margin from bottom
      
      // If space below is limited, show above the button
      if (spaceBelow < 200 && rect.top > 200) {
        // Position above with available space above
        const spaceAbove = rect.top;
        calculatedHeight = Math.min(maxHeight, spaceAbove - 20);
        setPosition({
          top: rect.top + window.scrollY - calculatedHeight,
          left: rect.left + window.scrollX,
          width: rect.width,
          maxHeight: calculatedHeight,
          direction: 'up'
        });
      } else {
        // Position below
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          maxHeight: calculatedHeight,
          direction: 'down'
        });
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  // Extract section names from objects or use as-is if strings
  const getSectionName = (section) => {
    if (typeof section === 'object' && section !== null) {
      return section.section_name || section.name || section.toString();
    }
    return section.toString();
  };

  const uniqueSections = Array.isArray(availableSections) 
    ? [...new Set(availableSections
        .filter(section => section != null && section !== '')
        .map(getSectionName))] 
    : [];

  return (
    <>
      <div className={styles.dropdownContainer}>
        <button 
          ref={buttonRef}
          className={styles.iconButton}
          onClick={() => setIsOpen(!isOpen)}
          title={selectedValue ? `Filtering: ${selectedValue}` : "Filter by section"}
        >
          <ExpandMoreIcon className={`${styles.expandIcon} ${isOpen ? styles.expandIconUp : ''}`} />
        </button>
      </div>

      {/* Portal the dropdown to body to escape table overflow constraints */}
      {isOpen && ReactDOM.createPortal(
        <div 
          ref={dropdownRef}
          className={`${styles.dropdownMenu} ${position.direction === 'up' ? styles.dropdownMenuUp : ''}`}
          style={{
            position: 'absolute',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            maxHeight: `${position.maxHeight}px`,
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          <div 
            className={`${styles.dropdownItem} ${!selectedValue ? styles.selectedItem : ''}`}
            onClick={() => handleSelect('')}
          >
            All Sections
          </div>
          {uniqueSections.map((sectionName) => (
            <div
              key={sectionName}
              className={`${styles.dropdownItem} ${selectedValue === sectionName ? styles.selectedItem : ''}`}
              onClick={() => handleSelect(sectionName)}
            >
              {sectionName}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default SectionDropdown;