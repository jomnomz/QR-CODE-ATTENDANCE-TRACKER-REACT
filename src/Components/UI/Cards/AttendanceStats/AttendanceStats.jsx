import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import styles from './AttendanceStats.module.css';

const AttendanceStats = ({
  selectedDate = null,
  className = '',
  getCurrentDate = null,
  compact = false,
  showRate = true
}) => {
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default function to get current Philippine date
  const defaultGetCurrentDate = useCallback(() => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  }, []);

  const getCurrentDateFunc = getCurrentDate || defaultGetCurrentDate;

  // Fetch attendance statistics
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const targetDate = selectedDate || getCurrentDateFunc();
      
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', targetDate);

      if (error) throw error;

      const counts = {
        present: 0,
        absent: 0,
        late: 0,
        total: attendanceData?.length || 0
      };

      attendanceData?.forEach(record => {
        switch (record.status) {
          case 'present':
            counts.present++;
            break;
          case 'absent':
            counts.absent++;
            break;
          case 'late':
            counts.late++;
            break;
        }
      });

      setStats(counts);
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
      setError('Failed to load statistics');
      setStats({
        present: 0,
        absent: 0,
        late: 0,
        total: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, getCurrentDateFunc]);

  // Calculate attendance percentage
  const calculateAttendanceRate = () => {
    const { present, late, total } = stats;
    const attended = present + late;
    return total > 0 ? ((attended / total) * 100).toFixed(1) : 0;
  };

  // Fetch stats when date changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className={`${styles.statsContainer} ${styles.loading} ${className}`}>
        <div className={styles.spinner}></div>
        <span>Loading stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.statsContainer} ${styles.error} ${className}`}>
        <span className={styles.errorText}>⚠️ {error}</span>
        <button 
          className={styles.retryButton}
          onClick={fetchStats}
          title="Retry"
        >
          ↻
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.statsContainer} ${compact ? styles.compact : ''} ${className}`}>
      <div className={styles.statsItem}>
        <span className={styles.statsLabel}>Total</span>
        <span className={`${styles.statsValue} ${styles.total}`}>
          {stats.total}
        </span>
      </div>
      
      <div className={styles.statsItem}>
        <span className={styles.statsLabel}>Present</span>
        <span className={`${styles.statsValue} ${styles.present}`}>
          {stats.present}
        </span>
      </div>
      
      <div className={styles.statsItem}>
        <span className={styles.statsLabel}>Late</span>
        <span className={`${styles.statsValue} ${styles.late}`}>
          {stats.late}
        </span>
      </div>
      
      <div className={styles.statsItem}>
        <span className={styles.statsLabel}>Absent</span>
        <span className={`${styles.statsValue} ${styles.absent}`}>
          {stats.absent}
        </span>
      </div>
      
      {showRate && (
        <div className={styles.statsItem}>
          <span className={styles.statsLabel}>Rate</span>
          <span className={`${styles.statsValue} ${styles.rate}`}>
            {calculateAttendanceRate()}%
          </span>
        </div>
      )}
    </div>
  );
};

export default AttendanceStats;