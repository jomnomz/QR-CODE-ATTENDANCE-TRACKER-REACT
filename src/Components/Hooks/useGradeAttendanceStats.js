import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const useGradeAttendanceStats = (teacherId, teacherSections) => {
  const [gradeStats, setGradeStats] = useState({
    labels: [],
    present: [],
    late: [],
    absent: [],
    presentCounts: [],
    lateCounts: [],
    absentCounts: [],
    totalStudents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPhilippinesDate = () => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  };

  // Helper function to extract grade number for sorting
  const getGradeNumber = (gradeLevel) => {
    const match = gradeLevel.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const fetchGradeAttendanceStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = getPhilippinesDate();
      
      // Get all grades - remove ORDER BY from query since we'll sort manually
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('id, grade_level');

      if (gradesError) throw gradesError;

      // Sort grades by grade number: 7, 8, 9, 10
      const sortedGrades = [...(grades || [])].sort((a, b) => {
        const gradeNumA = getGradeNumber(a.grade_level);
        const gradeNumB = getGradeNumber(b.grade_level);
        return gradeNumA - gradeNumB;
      });

      const stats = {
        labels: [],
        present: [],
        late: [],
        absent: [],
        presentCounts: [],
        lateCounts: [],
        absentCounts: [],
        totalStudents: []
      };

      for (const grade of sortedGrades) {
        // Get students for this grade
        let studentsQuery = supabase
          .from('students')
          .select('lrn, grade_id, section_id')
          .eq('grade_id', grade.id);

        // Filter by teacher's sections if provided
        if (teacherSections && teacherSections.length > 0) {
          const sectionIds = teacherSections.map(s => s.section_id);
          studentsQuery = studentsQuery.in('section_id', sectionIds);
        }

        const { data: students, error: studentsError } = await studentsQuery;
        if (studentsError) throw studentsError;

        if (!students || students.length === 0) {
          // If no students, add zero values
          stats.labels.push(grade.grade_level);
          stats.present.push(0);
          stats.late.push(0);
          stats.absent.push(0);
          stats.presentCounts.push(0);
          stats.lateCounts.push(0);
          stats.absentCounts.push(0);
          stats.totalStudents.push(0);
          continue;
        }

        const studentLRNs = students.map(s => s.lrn);

        // Get attendance for these students today
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance')
          .select('student_lrn, status')
          .eq('date', today)
          .in('student_lrn', studentLRNs);

        if (attendanceError) throw attendanceError;

        // Initialize counts
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        const totalStudents = students.length;

        // Count statuses
        if (attendanceRecords && attendanceRecords.length > 0) {
          attendanceRecords.forEach(record => {
            if (record.status === 'present') presentCount++;
            else if (record.status === 'late') lateCount++;
            else if (record.status === 'absent') absentCount++;
          });
        }

        // Calculate percentages
        const presentPercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
        const latePercent = totalStudents > 0 ? Math.round((lateCount / totalStudents) * 100) : 0;
        const absentPercent = totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0;

        stats.labels.push(grade.grade_level);
        stats.present.push(presentPercent);
        stats.late.push(latePercent);
        stats.absent.push(absentPercent);
        stats.presentCounts.push(presentCount);
        stats.lateCounts.push(lateCount);
        stats.absentCounts.push(absentCount);
        stats.totalStudents.push(totalStudents);
      }

      setGradeStats(stats);

      console.log('📊 Grade attendance stats loaded:', {
        teacherId,
        sections: teacherSections?.length || 'all',
        grades: sortedGrades.length,
        labels: stats.labels
      });

    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching grade attendance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradeAttendanceStats();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('grade-attendance-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        () => {
          fetchGradeAttendanceStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teacherId, teacherSections]);

  return {
    gradeStats,
    loading,
    error,
    refresh: fetchGradeAttendanceStats
  };
};