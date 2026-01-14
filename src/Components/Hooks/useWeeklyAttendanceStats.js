import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const useWeeklyAttendanceStats = (teacherId, teacherSections) => {
  const [weeklyStats, setWeeklyStats] = useState({
    dates: [],
    present: [],
    late: [],
    absent: [],
    presentCounts: [],
    lateCounts: [],
    absentCounts: [],
    hasRecords: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPhilippinesDate = (daysAgo = 0) => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    phTime.setDate(phTime.getDate() - daysAgo);
    return phTime.toISOString().split('T')[0];
  };

  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchWeeklyAttendanceStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get last 5 days including today
      const dates = [];
      for (let i = 4; i >= 0; i--) {
        dates.push(getPhilippinesDate(i));
      }

      // Get students based on teacher sections if provided
      let studentsQuery = supabase
        .from('students')
        .select('lrn');
      
      if (teacherSections && teacherSections.length > 0) {
        const sectionIds = teacherSections.map(s => s.section_id);
        studentsQuery = studentsQuery.in('section_id', sectionIds);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;
      
      if (!students || students.length === 0) {
        // If no students found
        const emptyStats = {
          dates: dates.map(formatDateLabel),
          present: [0, 0, 0, 0, 0],
          late: [0, 0, 0, 0, 0],
          absent: [0, 0, 0, 0, 0],
          presentCounts: [0, 0, 0, 0, 0],
          lateCounts: [0, 0, 0, 0, 0],
          absentCounts: [0, 0, 0, 0, 0],
          hasRecords: [false, false, false, false, false]
        };
        setWeeklyStats(emptyStats);
        return;
      }
      
      const studentLRNs = students.map(student => student.lrn);
      
      // Get attendance records for the last 5 days
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('date, status')
        .in('date', dates)
        .in('student_lrn', studentLRNs)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Initialize stats
      const stats = {
        dates: dates.map(formatDateLabel),
        present: [],
        late: [],
        absent: [],
        presentCounts: [],
        lateCounts: [],
        absentCounts: [],
        hasRecords: []
      };

      // Process each date
      dates.forEach((date, index) => {
        const dateRecords = attendanceRecords?.filter(record => record.date === date) || [];
        
        if (dateRecords.length === 0) {
          // No records for this date
          stats.present.push(0);
          stats.late.push(0);
          stats.absent.push(0);
          stats.presentCounts.push(0);
          stats.lateCounts.push(0);
          stats.absentCounts.push(0);
          stats.hasRecords.push(false);
          return;
        }

        // Count statuses for this date
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        dateRecords.forEach(record => {
          if (record.status === 'present') presentCount++;
          else if (record.status === 'late') lateCount++;
          else if (record.status === 'absent') absentCount++;
        });

        const total = presentCount + lateCount + absentCount;
        
        // Calculate percentages
        const presentPercent = total > 0 ? Math.round((presentCount / total) * 100) : 0;
        const latePercent = total > 0 ? Math.round((lateCount / total) * 100) : 0;
        const absentPercent = total > 0 ? Math.round((absentCount / total) * 100) : 0;

        stats.present.push(presentPercent);
        stats.late.push(latePercent);
        stats.absent.push(absentPercent);
        stats.presentCounts.push(presentCount);
        stats.lateCounts.push(lateCount);
        stats.absentCounts.push(absentCount);
        stats.hasRecords.push(true);
      });

      setWeeklyStats(stats);

      console.log('📊 Weekly attendance stats loaded:', {
        teacherId,
        sections: teacherSections?.length || 'all',
        totalStudents: students.length,
        stats
      });

    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching weekly attendance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyAttendanceStats();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('weekly-attendance-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        () => {
          fetchWeeklyAttendanceStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teacherId, teacherSections]);

  return {
    weeklyStats,
    loading,
    error,
    refresh: fetchWeeklyAttendanceStats
  };
};