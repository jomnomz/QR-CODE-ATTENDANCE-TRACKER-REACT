import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../Modal/Modal.jsx';
import styles from './PromoteModal.module.css';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx'; 
import { grades } from '../../../Utils/tableHelpers.js';
import { compareSections } from '../../../Utils/CompareHelpers.js'; 
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import StudentList from '../../List/StudentList/StudentList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';

function PromoteModal({ 
  isOpen, 
  onClose, 
  selectedStudents = [],
  studentData = [],
  onConfirm,
  currentGrade = '',
  allStudents = []
}) {
  const { success } = useToast();
  const [sectionInput, setSectionInput] = useState('');
  const [customSection, setCustomSection] = useState('');
  const [sectionInputMode, setSectionInputMode] = useState('select'); // 'select' or 'custom'
  
  const promoteCount = selectedStudents.length;

  // Calculate next grade
  const currentGradeIndex = grades.indexOf(currentGrade);
  const nextGrade = currentGradeIndex < grades.length - 1 ? grades[currentGradeIndex + 1] : null;

  // Get sections and student counts for target grade
  const targetGradeData = useMemo(() => {
    if (!nextGrade) return { sections: [], sectionCounts: {}, totalStudents: 0 };
    
    // Get all students in the target grade (nextGrade)
    const studentsInTargetGrade = allStudents.filter(
      student => student.grade?.toString() === nextGrade
    );
    
    // Get unique sections
    const sections = studentsInTargetGrade
      .map(student => student.section?.toString())
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    
    // Sort sections using compareSections (numerical order)
    const sortedSections = uniqueSections.sort((a, b) => compareSections(a, b));
    
    // Count students per section
    const sectionCounts = {};
    studentsInTargetGrade.forEach(student => {
      const section = student.section?.toString();
      if (section) {
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      }
    });
    
    return {
      sections: sortedSections,
      sectionCounts,
      totalStudents: studentsInTargetGrade.length
    };
  }, [allStudents, nextGrade]);

  // Get actual student objects from IDs
  const selectedStudentObjects = useMemo(() => 
    selectedStudents
      .map(studentId => studentData.find(s => s.id === studentId))
      .filter(student => student !== undefined),
    [selectedStudents, studentData]
  );

  // Get current section of selected students
  const currentSection = useMemo(() => {
    if (selectedStudentObjects.length === 0) return '';
    const firstSection = selectedStudentObjects[0].section;
    // Check if all selected students are in same section
    const allSameSection = selectedStudentObjects.every(student => 
      student.section === firstSection
    );
    return allSameSection ? firstSection : 'Various Sections';
  }, [selectedStudentObjects]);

  // Close modal if no students selected
  useEffect(() => {
    if (promoteCount === 0 && isOpen) {
      onClose();
    }
  }, [promoteCount, isOpen, onClose]);

  const handleConfirm = async () => {
    const finalSection = sectionInputMode === 'select' ? sectionInput : customSection;
    
    if (!finalSection.trim()) {
      // Show error - section is required
      return;
    }
    
    try {
      await onConfirm?.(selectedStudents, nextGrade, finalSection.trim());
      success(`${promoteCount} student${promoteCount !== 1 ? 's' : ''} promoted to Grade ${nextGrade}, Section ${finalSection.trim()}`);
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

  // If no next grade (trying to promote from highest grade), show error modal
  if (!nextGrade) {
    return (
      <Modal size="md" isOpen={isOpen} onClose={onClose}>
        <div className={styles.modalContainer}>
          <TitleModalLabel>Cannot Promote</TitleModalLabel>
          <div className={styles.message}>
            Grade {currentGrade} is the highest grade level. Students cannot be promoted further.
          </div>
          <div className={styles.buttonGroup}>
            <Button 
              label="Close"
              onClick={onClose}
              width="sm"
              height="sm"
            />
          </div>
        </div>
      </Modal>
    );
  }

  // Don't render if modal is not open or no students
  if (!isOpen || promoteCount === 0) {
    return null;
  }

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          Promote {promoteCount} Selected Student{promoteCount !== 1 ? 's' : ''}
        </TitleModalLabel>
        
        <div className={styles.gradeInfo}>
          <div className={styles.currentGrade}>
            <strong>From:</strong> Grade {currentGrade}
            {currentSection && currentSection !== 'Various Sections' && `, Section ${currentSection}`}
          </div>
          <div className={styles.arrow}>→</div>
          <div className={styles.targetGrade}>
            <strong>To:</strong> Grade {nextGrade}
          </div>
        </div>
        
        <div className={styles.sectionAssignment}>
          <label className={styles.sectionLabel}>
            Assign all {promoteCount} student{promoteCount !== 1 ? 's' : ''} to section:
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
                {targetGradeData.sections.map(section => (
                  <option key={section} value={section}>
                    {section} ({targetGradeData.sectionCounts[section] || 0} student/s)
                  </option>
                ))}
              </select>
              
              {targetGradeData.sections.length === 0 && (
                <div className={styles.noSectionsMessage}>
                  No sections exist in Grade {nextGrade}. Please create a new section.
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
                This will create a new section in Grade {nextGrade}
              </div>
            </div>
          )}
          
          {/* Show selected section preview */}
          {(sectionInput || customSection) && (
            <div className={styles.selectedSectionPreview}>
              <strong>Selected Section:</strong> {sectionInputMode === 'select' ? sectionInput : customSection}
              {sectionInputMode === 'select' && targetGradeData.sectionCounts[sectionInput] && (
                <span className={styles.sectionPreviewCount}>
                  ({targetGradeData.sectionCounts[sectionInput]} student{targetGradeData.sectionCounts[sectionInput] !== 1 ? 's' : ''} currently in this section)
                </span>
              )}
            </div>
          )}
        </div>

        {promoteCount > 0 && (
            <StudentList 
                students={selectedStudentObjects}
                variant="multiple"
                title="Students to Promote"
            />
        )}
        
        <InfoBox type="important">
            <strong>Important:</strong> All {promoteCount} selected student{promoteCount !== 1 ? 's' : ''} will be moved to 
            Grade {nextGrade}, Section <strong>{sectionInputMode === 'select' ? (sectionInput || '[select section]') : (customSection || '[enter section]')}</strong>. 
            They will no longer appear in Grade {currentGrade}.
        </InfoBox>

        <div className={styles.buttonGroup}>
          <Button
            label={`Promote to Grade ${nextGrade}`}
            color="primary"
            onClick={handleConfirm}
            width="lg"
            height="sm"
            disabled={!((sectionInputMode === 'select' && sectionInput) || (sectionInputMode === 'custom' && customSection))}
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

export default PromoteModal;