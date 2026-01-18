import React from 'react';
import styles from './StatusFilter.module.css';

const StatusFilter = ({
  value = 'all',
  onChange,
  showAllOption = true,
  statusOptions = [
    { value: 'all', label: 'All Status', color: '#6c757d' },
    { value: 'present', label: 'Present', color: '#2b8a3e' },
    { value: 'late', label: 'Late', color: '#e67700' },
    { value: 'absent', label: 'Absent', color: '#c92a2a' }
  ],
  className = '',
  label = 'Filter by Status:',
  showCounts = false,
  statusCounts = {}
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`${styles.statusFilter} ${className}`}>
      {label && (
        <label htmlFor="statusFilter" className={styles.filterLabel}>
          {label}
        </label>
      )}
      
      <select
        id="statusFilter"
        className={styles.statusSelect}
        value={value}
        onChange={handleChange}
      >
        {statusOptions.map((option) => {
          if (option.value === 'all' && !showAllOption) return null;
          
          const count = statusCounts[option.value] || 0;
          const displayLabel = showCounts && count !== undefined 
            ? `${option.label} (${count})`
            : option.label;
          
          return (
            <option key={option.value} value={option.value}>
              {displayLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default StatusFilter;