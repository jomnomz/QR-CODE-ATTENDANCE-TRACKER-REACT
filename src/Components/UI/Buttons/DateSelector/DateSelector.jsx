import React, { useCallback } from 'react';
import styles from './DateSelector.module.css';

const DateSelector = ({
  availableDates = [],
  selectedDate = '',
  onDateSelect,
  loading = false,
  showTodayIndicator = true,
  className = '',
  getCurrentDate = null,
  formatDateForDisplay = null
}) => {
  // Default function to get current Philippine date
  const defaultGetCurrentDate = useCallback(() => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  }, []);

  // Default function to format date for display
  const defaultFormatDateForDisplay = useCallback((dateString) => {
    if (!dateString) return '';
    
    const dateObj = new Date(dateString + 'T00:00:00Z');
    const phDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
    
    return phDate.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Use provided functions or defaults
  const getCurrentDateFunc = getCurrentDate || defaultGetCurrentDate;
  const formatDateFunc = formatDateForDisplay || defaultFormatDateForDisplay;

  // Check if a date is today
  const isToday = useCallback((dateString) => {
    if (!dateString) return false;
    const today = getCurrentDateFunc();
    return dateString === today;
  }, [getCurrentDateFunc]);

  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (onDateSelect) {
      onDateSelect(newDate);
    }
  };

  // Sort dates in descending order (most recent first)
  const sortedDates = [...availableDates].sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className={`${styles.dateSelector} ${className}`}>
      <div className={styles.dateSelectorInner}>
        {/* KEEP THE INDICATOR, just removed the icon and text */}
        {showTodayIndicator && (
          <div 
            className={`${styles.currentDateIndicator} ${
              !selectedDate || isToday(selectedDate) ? styles.currentDateIndicatorActive : ''
            }`}
          >
            {!selectedDate || isToday(selectedDate) ? 'Today' : 'Past Date'}
          </div>
        )}

        <select
          className={styles.dateSelect}
          value={selectedDate || getCurrentDateFunc()}
          onChange={handleDateChange}
          disabled={loading || availableDates.length === 0}
        >
          {sortedDates.map(date => {
            const formattedDate = formatDateFunc(date);
            const dateToday = isToday(date);
            
            return (
              <option key={date} value={date}>
                {formattedDate} {dateToday ? '(Today)' : ''}
              </option>
            );
          })}
        </select>
      </div>
      
      {loading && (
        <div className={styles.loadingIndicator}>
          Loading dates...
        </div>
      )}
    </div>
  );
};

export default DateSelector;