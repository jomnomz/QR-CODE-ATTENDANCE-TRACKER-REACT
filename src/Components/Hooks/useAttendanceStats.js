import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const useAttendanceStats = (teacherId, teacherSections) => {
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPhilippinesDate = () => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  };

  const fetchAttendanceStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = getPhilippinesDate();
      
      let studentLRNs = [];
      
      if (teacherSections && teacherSections.length > 0) {
        const sectionIds = teacherSections.map(section => section.section_id);
        
        const { data: sectionStudents, error: studentsError } = await supabase
          .from('students')
          .select('lrn')
          .in('section_id', sectionIds);
        
        if (studentsError) throw studentsError;
        
        if (!sectionStudents || sectionStudents.length === 0) {
          setStats({
            present: 0,
            late: 0,
            absent: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            total: 0
          });
          return;
        }
        
        studentLRNs = sectionStudents.map(student => student.lrn);
      }
      
      let attendanceQuery = supabase
        .from('attendance')
        .select('status')
        .eq('date', today);
      
      if (studentLRNs.length > 0) {
        attendanceQuery = attendanceQuery.in('student_lrn', studentLRNs);
      }
      
      const { data: attendanceRecords, error: attendanceError } = await attendanceQuery;
      
      if (attendanceError) throw attendanceError;
      
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      const total = attendanceRecords?.length || 0;
      
      if (attendanceRecords && attendanceRecords.length > 0) {
        attendanceRecords.forEach(record => {
          if (record.status === 'present') presentCount++;
          else if (record.status === 'late') lateCount++;
          else if (record.status === 'absent') absentCount++;
        });
      }
      
      const presentPercent = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      const latePercent = total > 0 ? Math.round((lateCount / total) * 100) : 0;
      const absentPercent = total > 0 ? Math.round((absentCount / total) * 100) : 0;
      
      setStats({
        present: presentPercent,
        late: latePercent,
        absent: absentPercent,
        presentCount: presentCount,
        lateCount: lateCount,
        absentCount: absentCount,
        total: total
      });
      
      console.log('📊 Attendance stats loaded:', {
        teacherId,
        sections: teacherSections?.length || 'all',
        presentCount,
        lateCount,
        absentCount,
        total
      });
      
    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching attendance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceStats();
    
    const subscription = supabase
      .channel('attendance-pie-chart')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        () => {
          fetchAttendanceStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teacherId, teacherSections]);

  return {
    stats,
    loading,
    error
  };
};