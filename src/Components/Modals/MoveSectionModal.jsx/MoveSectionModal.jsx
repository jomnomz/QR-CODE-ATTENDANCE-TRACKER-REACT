import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../Modal/Modal.jsx';
import styles from './MoveSectionModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx'; 
import { compareSections } from '../../../Utils/CompareHelpers.js';
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import StudentList from '../../List/StudentList/StudentList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';

function MoveSectionModal({ 
  isOpen, 
  onClose, 
  selectedStudents = [],
  studentData = [],
  onConfirm,
  currentGrade = '',
  allStudents = []
}) {
  const { success, warning } = useToast();
  const [sectionInput, setSectionInput] = useState('');
  const [customSection, setCustomSection] = useState('');
  const [sectionInputMode, setSectionInputMode] = useState('select'); // 'select' or 'custom'
  
  const moveCount = selectedStudents.length;

  // Get sections and student counts for current grade
  const currentGradeData = useMemo(() => {
    if (!currentGrade) return { sections: [], sectionCounts: {}, totalStudents: 0 };
    
    // Get all students in the current grade
    const studentsInCurrentGrade = allStudents.filter(
      student => student.grade?.toString() === currentGrade
    );
    
    // Get unique sections
    const sections = studentsInCurrentGrade
      .map(student => student.section?.toString())
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    
    // Sort sections using compareSections
    const sortedSections = uniqueSections.sort((a, b) => compareSections(a, b));
    
    // Count students per section
    const sectionCounts = {};
    studentsInCurrentGrade.forEach(student => {
      const section = student.section?.toString();
      if (section) {
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      }
    });
    
    return {
      sections: sortedSections,
      sectionCounts,
      totalStudents: studentsInCurrentGrade.length
    };
  }, [allStudents, currentGrade]);

  // Get actual student objects from IDs
  const selectedStudentObjects = useMemo(() => 
    selectedStudents
      .map(studentId => studentData.find(s => s.id === studentId))
      .filter(student => student !== undefined),
    [selectedStudents, studentData]
  );

  // Get current sections of selected students
  const currentSections = useMemo(() => {
    if (selectedStudentObjects.length === 0) return new Set();
    
    const sections = new Set();
    selectedStudentObjects.forEach(student => {
      if (student.section) {
        sections.add(student.section);
      }
    });
    return sections;
  }, [selectedStudentObjects]);

  // Check if all selected students are already in the target section
  const isMovingToSameSection = useMemo(() => {
    if (!sectionInput || sectionInputMode !== 'select') return false;
    return Array.from(currentSections).every(section => section === sectionInput);
  }, [sectionInput, sectionInputMode, currentSections]);

  // Close modal if no students selected
  useEffect(() => {
    if (moveCount === 0 && isOpen) {
      onClose();
    }
  }, [moveCount, isOpen, onClose]);

  const handleConfirm = async () => {
    const finalSection = sectionInputMode === 'select' ? sectionInput : customSection;
    
    if (!finalSection.trim()) {
      // Show error - section is required
      return;
    }
    
    if (isMovingToSameSection) {
      warning('Selected students are already in this section');
      return;
    }
    
    try {
      await onConfirm?.(selectedStudents, finalSection.trim());
      success(`${moveCount} student${moveCount !== 1 ? 's' : ''} moved to Section ${finalSection.trim()}`);
      setSectionInput('');
      setCustomSection('');
      onClose();
    } catch (error) {
      onClose();
    }
  };

  const handleSelectChange = (e) => {
    setSectionInput(e.target.value);
  };

  const handleCustomChange = (e) => {
    setCustomSection(e.target.value);
  };

  // Don't render if modal is not open or no students
  if (!isOpen || moveCount === 0) {
    return null;
  }

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          Move {moveCount} Selected Student{moveCount !== 1 ? 's' : ''}
        </TitleModalLabel>
        
        <div className={styles.gradeInfo}>
          <div className={styles.currentGrade}>
            <strong>Grade:</strong> {currentGrade}
            {currentSections.size > 0 && (
              <span className={styles.currentSections}>
                {currentSections.size === 1 
                  ? `, Section ${Array.from(currentSections)[0]}`
                  : `, ${currentSections.size} different sections`
                }
              </span>
            )}
          </div>
        </div>
        
        <div className={styles.sectionAssignment}>
          <label className={styles.sectionLabel}>
            Move all {moveCount} student{moveCount !== 1 ? 's' : ''} to section:
          </label>
          
          {/* Section Selection Mode Tabs */}
          <div className={styles.sectionModeTabs}>
            <button
              type="button"
              className={`${styles.sectionModeTab} ${sectionInputMode === 'select' ? styles.activeTab : ''}`}
              onClick={() => setSectionInputMode('select')}
            >
              Select Existing Section
            </button>
            <button
              type="button"
              className={`${styles.sectionModeTab} ${sectionInputMode === 'custom' ? styles.activeTab : ''}`}
              onClick={() => setSectionInputMode('custom')}
            >
              Create New Section
            </button>
          </div>
          
          {/* Select from existing sections */}
          {sectionInputMode === 'select' && (
            <div className={styles.selectSectionContainer}>
              <select
                value={sectionInput}
                onChange={handleSelectChange}
                className={styles.sectionSelect}
              >
                <option value="">Choose a section...</option>
                {currentGradeData.sections.map(section => (
                  <option key={section} value={section}>
                    {section} ({currentGradeData.sectionCounts[section] || 0} student/s)
                  </option>
                ))}
              </select>
              
              {currentGradeData.sections.length === 0 && (
                <div className={styles.noSectionsMessage}>
                  No sections exist in Grade {currentGrade}. Please create a new section.
                </div>
              )}
            </div>
          )}
          
          {/* Create custom section */}
          {sectionInputMode === 'custom' && (
            <div className={styles.customSectionContainer}>
              <input
                type="text"
                value={customSection}
                onChange={handleCustomChange}
                className={styles.customSectionInput}
                placeholder="Enter new section name"
                autoComplete="off"
              />
              <div className={styles.customSectionNote}>
                This will create a new section in Grade {currentGrade}
              </div>
            </div>
          )}
          
          {/* Show selected section preview */}
          {(sectionInput || customSection) && (
            <div className={styles.selectedSectionPreview}>
              <strong>Selected Section:</strong> {sectionInputMode === 'select' ? sectionInput : customSection}
              {sectionInputMode === 'select' && currentGradeData.sectionCounts[sectionInput] && (
                <span className={styles.sectionPreviewCount}>
                  ({currentGradeData.sectionCounts[sectionInput]} student{currentGradeData.sectionCounts[sectionInput] !== 1 ? 's' : ''} currently in this section)
                </span>
              )}
              {isMovingToSameSection && (
                <div className={styles.warningText}>
                  ⚠️ Selected students are already in this section
                </div>
              )}
            </div>
          )}
        </div>

        {moveCount > 0 && (
            <StudentList 
            students={selectedStudentObjects}
            variant="multiple"
            title="Students to be Moved"
            />
        )}
        
        <InfoBox type="important">
            <strong>Important:</strong> All {moveCount} selected student{moveCount !== 1 ? 's' : ''} will be moved to 
            Section <strong>{sectionInputMode === 'select' ? (sectionInput || '[section]') : (customSection || '[section]')}</strong> in Grade {currentGrade}. 
            {currentSections.size > 1 && " Students are currently in different sections."}
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label={`Move to Section`}
            color="primary"
            onClick={handleConfirm}
            width="lg"
            height="sm"
            disabled={!((sectionInputMode === 'select' && sectionInput) || (sectionInputMode === 'custom' && customSection)) || isMovingToSameSection}
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

export default MoveSectionModal;