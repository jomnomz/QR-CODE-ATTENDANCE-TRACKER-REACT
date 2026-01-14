import React from 'react';
import { 
  formatGradeSection,
  formatStudentDisplayName,
  formatTeacherDisplayName,
} from '../../../Utils/Formatters'; 
import styles from './EntityList.module.css';

function EntityList({ 
  entities = [], 
  maxHeight = "100px",
  title = "Entities included",
  showNumbers = true,
  variant = 'multiple',
  entityType = 'student' 
}) {
  if (entities.length === 0) {
    return null;
  }

  // Helper function to format GradeSection display
  const formatGradeSectionDisplay = (gradeSection) => {
    if (!gradeSection) return '';
    return `${gradeSection.grade || ''} - ${gradeSection.section || ''}${gradeSection.room && gradeSection.room !== 'N/A' ? ` (Room ${gradeSection.room})` : ''}`;
  };

  // Helper function to format Subject display
  const formatSubjectDisplay = (subject) => {
    if (!subject) return '';
    return `${subject.subject_code || ''} - ${subject.subject_name || ''}`;
  };

  const formatEntityDetails = (entity) => {
    switch (entityType) {
      case 'student':
        return {
          identifier: entity.lrn || '',
          name: formatStudentDisplayName(entity),
          details: formatGradeSection(entity)
        };
      
      case 'teacher':
        return {
          identifier: entity.employee_id || '',
          name: formatTeacherDisplayName(entity),
          details: entity.email_address || 'NA'
        };
      
      case 'subject':
        return {
          identifier: entity.subject_code || '',
          name: entity.subject_name || '',
          details: '' // Subjects don't need extra details
        };
      
      case 'gradeSection':
        return {
          identifier: `${entity.grade || ''}-${entity.section || ''}`,
          name: formatGradeSectionDisplay(entity),
          details: entity.room && entity.room !== 'N/A' ? `Room ${entity.room}` : ''
        };
      
      default:
        return { identifier: '', name: '', details: '' };
    }
  };

  const getTitle = () => {
    const entityTypeText = {
      student: 'Student',
      teacher: 'Teacher', 
      subject: 'Subject',
      gradeSection: 'Grade Section'
    }[entityType] || 'Entity';
    
    return `${title} (${entities.length} ${entityTypeText}${entities.length !== 1 ? 's' : ''}):`;
  };

  // Helper to determine what to display for each entity type
  const getEntityDisplayText = (details) => {
    switch (entityType) {
      case 'student':
        return `${details.identifier} | ${details.name} | ${details.details}`;
      
      case 'teacher':
        return `${details.identifier} | ${details.name} | ${details.details}`;
      
      case 'subject':
        return `${details.identifier} - ${details.name}`;
      
      case 'gradeSection':
        return details.name;
      
      default:
        return `${details.identifier} | ${details.name} | ${details.details}`;
    }
  };

  if (variant === 'single' && entities.length === 1) {
    const entity = entities[0];
    const details = formatEntityDetails(entity);
    return (
      <div className={styles.singleEntityContainer}>
        <div className={styles.singleEntityHeader}>
          {title || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}:`}
        </div>
        <div className={styles.singleEntityDetails}>
          {getEntityDisplayText(details)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.entityListContainer}>
      <div className={styles.listHeader}>
        {getTitle()}
      </div>
      <div className={styles.entityList} style={{ maxHeight }}>
        {entities.map((entity, index) => {
          const details = formatEntityDetails(entity);
          return (
            <div key={entity.id} className={styles.entityItem}>
              {showNumbers && (
                <div className={styles.entityNumber}>{index + 1}.</div>
              )}
              <div className={styles.entityDetails}>
                <div className={styles.entityName}>
                  {getEntityDisplayText(details)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EntityList;