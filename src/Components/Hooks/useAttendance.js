import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase'; 

export const useAttendance = () => {
  const [currentClass, setCurrentClass] = useState('all'); // Change default to 'all'
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

      // Filter by grade if not 'all'
      if (grade !== 'all') {
        studentsQuery = studentsQuery.eq('grade', grade);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Get today's attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      // Combine students with their attendance records
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
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'attendance',
        },
        async (payload) => {
          console.log('🔄 REAL-TIME ATTENDANCE:', payload.eventType, payload.new);
          
          const changedDate = payload.new?.date || payload.old?.date;
          
          // Only process today's records
          if (changedDate === currentDateRef.current) {
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              console.log('📝 Processing attendance update for student:', payload.new.student_lrn);
              
              try {
                // Get student data for this attendance record
                const { data: student, error: studentError } = await supabase
                  .from('students')
                  .select('*')
                  .eq('lrn', payload.new.student_lrn)
                  .single();

                if (studentError) {
                  console.error('❌ Error fetching student:', studentError);
                  return;
                }

                // Check if student is in current class filter
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
                      // Update existing record
                      console.log('✅ Updating existing attendance record');
                      const updated = [...prev];
                      updated[index] = updatedAttendance;
                      return updated;
                    } else {
                      // Add new record
                      console.log('🆕 Adding new attendance record');
                      return [...prev, updatedAttendance];
                    }
                  });
                  
                  console.log('🎉 Attendance updated successfully in real-time');
                } else {
                  console.log('❌ Student not in current class filter');
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
          } else {
            console.log('📅 Ignoring attendance change - wrong date:', changedDate);
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

  // Initial fetch and date change handling
  useEffect(() => {
    fetchAttendance(currentClass);
  }, [currentClass]);

  // Daily date check
  useEffect(() => {
    const checkDate = () => {
      const today = getPhilippinesDate();
      if (today !== currentDateRef.current) {
        console.log('📅 Date changed to:', today);
        currentDateRef.current = today;
        setCurrentDate(today);
        fetchAttendance(currentClass);
      }
    };

    // Check every minute
    const interval = setInterval(checkDate, 60000);
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

  return {
    currentClass,
    attendances,
    loading,
    error,
    currentDate: getCurrentDisplayDate(),
    changeClass,
    refreshAttendance
  };
};