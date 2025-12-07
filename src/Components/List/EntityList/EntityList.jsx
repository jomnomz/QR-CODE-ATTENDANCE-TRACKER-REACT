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
  entityType = 'student' // 'student' or 'teacher'
}) {
  if (entities.length === 0) {
    return null;
  }

  // Format entity details based on type
  const formatEntityDetails = (entity) => {
    if (entityType === 'student') {
      return {
        identifier: entity.lrn,
        name: formatStudentDisplayName(entity),
        details: formatGradeSection(entity)
      };
    } else if (entityType === 'teacher') {
      return {
        identifier: entity.employee_id,
        name: formatTeacherDisplayName(entity),
        details: entity.email_address || 'NA'
      };
    }
    return { identifier: '', name: '', details: '' };
  };

  // Get the title text
  const getTitle = () => {
    const entityTypeText = entityType === 'student' ? 'Students' : 'Teachers';
    return `${title} (${entities.length} ${entityTypeText}${entities.length !== 1 ? 's' : ''}):`;
  };

  // If single entity variant and we have exactly 1 entity
  if (variant === 'single' && entities.length === 1) {
    const entity = entities[0];
    const details = formatEntityDetails(entity);
    return (
      <div className={styles.singleEntityContainer}>
        <div className={styles.singleEntityHeader}>{title || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}:`}</div>
        <div className={styles.singleEntityDetails}>
          <strong>{details.identifier}</strong> | {details.name} | {details.details}
        </div>
      </div>
    );
  }

  // Multiple entities variant
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
                  <strong>{details.identifier}</strong> | {details.name} | {details.details}
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