import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase'; 

export const useAttendance = () => {
  const [currentClass, setCurrentClass] = useState('all');
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get Philippines time (UTC+8)
  const getPhilippinesDate = () => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  };

  const [currentDate, setCurrentDate] = useState(() => getPhilippinesDate());
  const currentDateRef = useRef(currentDate);

  // Function to create absent records for all students at the end of the day
  const createAbsentRecordsForAllStudents = async () => {
    try {
      const yesterday = new Date(currentDateRef.current);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log(`📅 Creating absent records for yesterday: ${yesterdayStr}`);
      
      // Get all students
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('lrn, grade, section, first_name, last_name');
      
      if (studentsError) throw studentsError;
      
      // Get yesterday's attendance records
      const { data: yesterdayAttendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_lrn')
        .eq('date', yesterdayStr);
      
      if (attendanceError) throw attendanceError;
      
      // Find students who were absent yesterday
      const attendedStudents = yesterdayAttendance?.map(record => record.student_lrn) || [];
      const absentStudents = allStudents.filter(student => 
        !attendedStudents.includes(student.lrn)
      );
      
      if (absentStudents.length > 0) {
        console.log(`📊 Found ${absentStudents.length} absent students for ${yesterdayStr}`);
        
        // Create absent records
        const absentRecords = absentStudents.map(student => ({
          student_lrn: student.lrn,
          status: 'absent',
          date: yesterdayStr,
          created_at: new Date().toISOString()
        }));
        
        // Insert absent records in batches
        const batchSize = 50;
        for (let i = 0; i < absentRecords.length; i += batchSize) {
          const batch = absentRecords.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('attendance')
            .insert(batch);
          
          if (insertError) {
            console.error('❌ Error inserting absent records:', insertError);
          }
        }
        
        console.log(`✅ Created ${absentRecords.length} absent records for ${yesterdayStr}`);
      }
    } catch (error) {
      console.error('❌ Error creating absent records:', error);
    }
  };

  // Function to clean up old data (older than 1 year)
  const cleanupOldAttendanceData = async () => {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
      
      console.log(`🗑️ Cleaning up attendance data older than: ${oneYearAgoStr}`);
      
      const { error } = await supabase
        .from('attendance')
        .delete()
        .lt('date', oneYearAgoStr);
      
      if (error) {
        console.error('❌ Error cleaning up old data:', error);
      } else {
        console.log('✅ Old attendance data cleaned up successfully');
      }
    } catch (error) {
      console.error('❌ Error in cleanup function:', error);
    }
  };

  // Check and run maintenance tasks at midnight
  const runMaintenanceTasks = async () => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const phHours = phTime.getUTCHours();
    const phMinutes = phTime.getUTCMinutes();
    
    // Run at 12:05 AM Philippines time
    if (phHours === 0 && phMinutes === 5) {
      console.log('🕛 Running midnight maintenance tasks...');
      
      // 1. Create absent records for yesterday
      await createAbsentRecordsForAllStudents();
      
      // 2. Clean up data older than 1 year (run once a month on the 1st)
      const phDate = phTime.getUTCDate();
      if (phDate === 1) {
        await cleanupOldAttendanceData();
      }
      
      console.log('✅ Midnight maintenance tasks completed');
    }
  };

  const fetchAttendance = async (grade) => {
    setLoading(true);
    setError(null);
    
    try {
      const today = currentDateRef.current;
      
      console.log(`📊 Fetching attendance for ${grade === 'all' ? 'all grades' : `Grade ${grade}`} on ${today}`);
      
      // Get all students
      let studentsQuery = supabase
        .from('students')
        .select('*')
        .order('last_name');

      if (grade !== 'all') {
        studentsQuery = studentsQuery.eq('grade', grade);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Get today's attendance records (including absent records)
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .order('time_in', { ascending: true });

      if (attendanceError) throw attendanceError;

      // Combine all students with attendance records
      // If no record exists, they'll show as 'absent' by default in the frontend
      const combinedData = students.map(student => {
        const todayRecord = attendanceRecords?.find(record => 
          record.student_lrn === student.lrn
        );

        return {
          id: `${student.id}-${today}`,
          lrn: student.lrn,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.last_name,
          grade: student.grade,
          section: student.section,
          time_in: todayRecord?.time_in || null,
          time_out: todayRecord?.time_out || null,
          date: today,
          // If no record exists in database, they're absent for today
          // But we'll let the frontend handle showing them as absent
          status: todayRecord?.status || 'absent',
          student_lrn: student.lrn,
          created_at: todayRecord?.created_at,
          has_record: !!todayRecord,
          student_id: student.id
        };
      });

      setAttendances(combinedData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for attendance changes
  useEffect(() => {
    console.log('🔔 Setting up real-time attendance subscription');
    
    const subscription = supabase
      .channel('attendance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        async (payload) => {
          console.log('🔄 REAL-TIME ATTENDANCE:', payload.eventType, payload.new);
          
          const changedDate = payload.new?.date || payload.old?.date;
          
          if (changedDate === currentDateRef.current) {
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              console.log('📝 Processing attendance update for student:', payload.new.student_lrn);
              
              try {
                const { data: student, error: studentError } = await supabase
                  .from('students')
                  .select('*')
                  .eq('lrn', payload.new.student_lrn)
                  .single();

                if (studentError) {
                  console.error('❌ Error fetching student:', studentError);
                  return;
                }

                if (student && (currentClass === 'all' || student.grade === currentClass)) {
                  const updatedAttendance = {
                    id: `${student.id}-${currentDateRef.current}`,
                    lrn: student.lrn,
                    first_name: student.first_name,
                    middle_name: student.middle_name,
                    last_name: student.last_name,
                    grade: student.grade,
                    section: student.section,
                    time_in: payload.new.time_in,
                    time_out: payload.new.time_out,
                    date: payload.new.date,
                    status: payload.new.status || 'present',
                    student_lrn: student.lrn,
                    created_at: payload.new.created_at,
                    has_record: true,
                    student_id: student.id
                  };

                  setAttendances(prev => {
                    const index = prev.findIndex(a => a.student_lrn === updatedAttendance.student_lrn);
                    
                    if (index >= 0) {
                      const updated = [...prev];
                      updated[index] = updatedAttendance;
                      return updated;
                    } else {
                      return [...prev, updatedAttendance];
                    }
                  });
                }
              } catch (err) {
                console.error('❌ Error processing attendance update:', err);
              }
            }
            
            if (payload.eventType === 'DELETE') {
              console.log('🗑️ Removing attendance record for:', payload.old.student_lrn);
              setAttendances(prev => 
                prev.filter(a => a.student_lrn !== payload.old.student_lrn)
              );
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Attendance subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up attendance subscription');
      subscription.unsubscribe();
    };
  }, [currentClass]);

  // Initial fetch
  useEffect(() => {
    fetchAttendance(currentClass);
  }, [currentClass]);

  // Daily date check and maintenance tasks
  useEffect(() => {
    const checkDateAndRunMaintenance = () => {
      const today = getPhilippinesDate();
      if (today !== currentDateRef.current) {
        console.log('📅 Date changed to:', today);
        currentDateRef.current = today;
        setCurrentDate(today);
        fetchAttendance(currentClass);
      }
      
      // Run maintenance tasks (will only execute at 12:05 AM)
      runMaintenanceTasks();
    };

    // Check every 5 minutes (for maintenance tasks and date change)
    const interval = setInterval(checkDateAndRunMaintenance, 300000);
    
    // Initial check
    checkDateAndRunMaintenance();
    
    return () => clearInterval(interval);
  }, [currentClass]);

  const changeClass = (className) => {
    setCurrentClass(className);
  };

  const refreshAttendance = () => {
    fetchAttendance(currentClass);
  };

  const getCurrentDisplayDate = () => {
    const phTime = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
    return phTime.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Manual trigger for creating absent records (for testing/admin use)
  const triggerCreateAbsentRecords = () => {
    createAbsentRecordsForAllStudents();
  };

  // Manual trigger for cleanup (for testing/admin use)
  const triggerCleanup = () => {
    cleanupOldAttendanceData();
  };

  return {
    currentClass,
    attendances,
    loading,
    error,
    currentDate: getCurrentDisplayDate(),
    changeClass,
    refreshAttendance,
    triggerCreateAbsentRecords, // Optional: expose for admin panel
    triggerCleanup // Optional: expose for admin panel
  };
};