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

  const getPhilippinesDateTime = () => {
    const now = new Date();
    return new Date(now.getTime() + (8 * 60 * 60 * 1000));
  };

  const [currentDate, setCurrentDate] = useState(() => getPhilippinesDate());
  const currentDateRef = useRef(currentDate);

  // ==================== CORE FUNCTIONS ====================
  // 1. Create default absent records for TODAY
  const createDefaultAbsentRecordsForToday = async () => {
    try {
      const today = currentDateRef.current;
      console.log(`📅 Creating default absent records for TODAY: ${today}`);
      
      // Get all active students
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          grade:grades(grade_level),
          section:sections(section_name)
        `)
        .order('last_name');
      
      if (studentsError) throw studentsError;
      
      if (!allStudents || allStudents.length === 0) {
        console.log('📭 No students found to create attendance records');
        return;
      }
      
      // Check if attendance records already exist for today
      const { data: existingAttendance, error: checkError } = await supabase
        .from('attendance')
        .select('student_lrn')
        .eq('date', today)
        .limit(1);
      
      if (checkError) throw checkError;
      
      // Skip if records already exist
      if (existingAttendance && existingAttendance.length > 0) {
        console.log(`📋 Attendance records already exist for ${today}, skipping`);
        return;
      }
      
      // Create default absent records for all students
      const defaultRecords = allStudents.map(student => ({
        student_lrn: student.lrn,
        student_id: student.id,
        status: 'absent',
        date: today,
        created_at: getPhilippinesDateTime().toISOString(),
        time_in: null,
        time_out: null,
        scan_type: null
      }));
      
      console.log(`📝 Creating ${defaultRecords.length} default absent records for ${today}`);
      
      // Insert in batches
      const batchSize = 50;
      for (let i = 0; i < defaultRecords.length; i += batchSize) {
        const batch = defaultRecords.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(batch);
        
        if (insertError) {
          console.error('❌ Error inserting default records:', insertError);
        }
      }
      
      console.log(`✅ Created ${defaultRecords.length} default absent records for ${today}`);
      
    } catch (error) {
      console.error('❌ Error creating default absent records:', error);
    }
  };

  // 2. Clean up duplicate attendance records
  const cleanupDuplicateAttendance = async () => {
    try {
      console.log('🔄 Checking for duplicate attendance records...');
      
      // Find all attendance records
      const { data: allRecords, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      if (!allRecords || allRecords.length === 0) return;
      
      // Group by student_lrn + date to find duplicates
      const grouped = {};
      allRecords.forEach(record => {
        const key = `${record.student_lrn}-${record.date}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(record);
      });
      
      // Identify duplicates
      const duplicatesToDelete = [];
      
      Object.values(grouped).forEach(group => {
        if (group.length > 1) {
          // Keep the most recent record, delete older ones
          group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const [mostRecent, ...olderRecords] = group;
          olderRecords.forEach(record => duplicatesToDelete.push(record.id));
        }
      });
      
      if (duplicatesToDelete.length > 0) {
        console.log(`🗑️ Found ${duplicatesToDelete.length} duplicate records to delete`);
        
        // Delete in batches
        const batchSize = 50;
        for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
          const batch = duplicatesToDelete.slice(i, i + batchSize);
          const { error: deleteError } = await supabase
            .from('attendance')
            .delete()
            .in('id', batch);
          
          if (deleteError) {
            console.error('❌ Error deleting duplicate batch:', deleteError);
          }
        }
        
        console.log(`✅ Cleaned ${duplicatesToDelete.length} duplicate records`);
      } else {
        console.log('✅ No duplicate records found');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning duplicates:', error);
    }
  };

  // ==================== ATTENDANCE FETCHING ====================
  const fetchAttendance = async (grade) => {
    setLoading(true);
    setError(null);
    
    try {
      const today = currentDateRef.current;
      
      console.log(`📊 Fetching attendance for ${grade === 'all' ? 'all grades' : `Grade ${grade}`} on ${today}`);
      
      // Get all students with proper grade and section joins
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          middle_name,
          grade:grades(id, grade_level),
          section:sections(section_name)
        `)
        .order('last_name');

      if (grade !== 'all') {
        studentsQuery = studentsQuery.eq('grades.grade_level', grade.includes('Grade ') ? grade : `Grade ${grade}`);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Get today's attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .order('time_in', { ascending: true });

      if (attendanceError) throw attendanceError;

      // Map students to their attendance records
      const combinedData = students.map(student => {
        // Find attendance record for this student
        const todayRecord = attendanceRecords?.find(record => 
          record.student_lrn === student.lrn || record.student_id === student.id
        );

        // If no record exists, create a temporary absent record
        if (!todayRecord) {
          return {
            id: `temp-${student.id}-${today}`,
            lrn: student.lrn,
            first_name: student.first_name,
            last_name: student.last_name,
            middle_name: student.middle_name,
            grade: student.grade?.grade_level || 'N/A',
            section: student.section?.section_name || 'N/A',
            time_in: null,
            time_out: null,
            date: today,
            status: 'absent',
            student_lrn: student.lrn,
            created_at: null,
            scan_type: null,
            student_id: student.id,
            has_record: false,
            is_temporary: true
          };
        }

        return {
          id: todayRecord.id,
          lrn: student.lrn,
          first_name: student.first_name,
          last_name: student.last_name,
          middle_name: student.middle_name,
          grade: student.grade?.grade_level || 'N/A',
          section: student.section?.section_name || 'N/A',
          time_in: todayRecord.time_in,
          time_out: todayRecord.time_out,
          date: todayRecord.date,
          status: todayRecord.status, // This can be 'present', 'late', or 'absent'
          student_lrn: todayRecord.student_lrn,
          created_at: todayRecord.created_at,
          scan_type: todayRecord.scan_type,
          student_id: todayRecord.student_id,
          has_record: true,
          is_temporary: false
        };
      });

      setAttendances(combinedData);
      console.log(`✅ Loaded ${combinedData.length} attendance records for ${today}`);
      
    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== REAL-TIME UPDATES ====================
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
          const changedDate = payload.new?.date || payload.old?.date;
          
          // Only process if it's today's attendance
          if (changedDate === currentDateRef.current) {
            console.log('🔄 Attendance change detected for today:', payload.eventType);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              try {
                // Get student info for this attendance record
                const { data: student } = await supabase
                  .from('students')
                  .select(`
                    id,
                    lrn,
                    first_name,
                    last_name,
                    middle_name,
                    grade:grades(grade_level),
                    section:sections(section_name)
                  `)
                  .or(`lrn.eq.${payload.new.student_lrn},id.eq.${payload.new.student_id}`)
                  .single();

                if (student) {
                  const studentGrade = student.grade?.grade_level;
                  const gradeMatch = currentClass === 'all' || 
                    studentGrade === currentClass || 
                    studentGrade === `Grade ${currentClass}`;
                  
                  if (gradeMatch) {
                    const updatedAttendance = {
                      id: payload.new.id,
                      lrn: student.lrn,
                      first_name: student.first_name,
                      last_name: student.last_name,
                      middle_name: student.middle_name,
                      grade: student.grade?.grade_level || 'N/A',
                      section: student.section?.section_name || 'N/A',
                      time_in: payload.new.time_in,
                      time_out: payload.new.time_out,
                      date: payload.new.date,
                      status: payload.new.status, // Includes 'late' status
                      student_lrn: payload.new.student_lrn,
                      created_at: payload.new.created_at,
                      scan_type: payload.new.scan_type,
                      student_id: payload.new.student_id,
                      has_record: true,
                      is_temporary: false
                    };

                    setAttendances(prev => {
                      // Remove any temporary record for this student
                      const filtered = prev.filter(a => 
                        !(a.student_lrn === updatedAttendance.student_lrn && a.is_temporary)
                      );
                      
                      // Find index of existing record
                      const index = filtered.findIndex(a => 
                        a.student_lrn === updatedAttendance.student_lrn || 
                        a.student_id === updatedAttendance.student_id
                      );
                      
                      if (index >= 0) {
                        const updated = [...filtered];
                        updated[index] = updatedAttendance;
                        return updated;
                      } else {
                        return [...filtered, updatedAttendance];
                      }
                    });
                  }
                }
              } catch (err) {
                console.error('❌ Error processing attendance update:', err);
              }
            }
            
            if (payload.eventType === 'DELETE') {
              setAttendances(prev => 
                prev.filter(a => 
                  !(a.student_lrn === payload.old.student_lrn && !a.is_temporary)
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentClass]);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    const initialize = async () => {
      console.log('🚀 Initializing attendance system...');
      
      // Clean up duplicates on initial load
      await cleanupDuplicateAttendance();
      
      const today = currentDateRef.current;
      
      // Check if today's default records exist, create them if not
      const { data: todayAttendance, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('date', today)
        .limit(1);
      
      if (error) {
        console.error('❌ Error checking today\'s attendance:', error);
      } else if (!todayAttendance || todayAttendance.length === 0) {
        // No records for today → create default absent records
        console.log('🌅 No attendance records found for today, creating defaults...');
        await createDefaultAbsentRecordsForToday();
      }
      
      // Fetch attendance data
      await fetchAttendance(currentClass);
    };
    
    initialize();
  }, [currentClass]);

  // ==================== DATE CHANGE HANDLER ====================
  useEffect(() => {
    const checkDateChange = () => {
      const today = getPhilippinesDate();
      
      if (today !== currentDateRef.current) {
        console.log('📅 Date changed:', currentDateRef.current, '→', today);
        currentDateRef.current = today;
        setCurrentDate(today);
        
        // Refresh data for new date
        fetchAttendance(currentClass);
      }
    };
    
    // Check for date change every minute
    const interval = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(interval);
  }, [currentClass]);

  // ==================== STATUS UTILITIES ====================
  const getStatusCounts = () => {
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      total: attendances.length
    };
    
    attendances.forEach(attendance => {
      if (attendance.status === 'present') {
        counts.present++;
      } else if (attendance.status === 'late') {
        counts.late++;
      } else if (attendance.status === 'absent') {
        counts.absent++;
      }
    });
    
    return counts;
  };

  const getAttendanceSummary = () => {
    const counts = getStatusCounts();
    const attended = counts.present + counts.late;
    
    return {
      ...counts,
      attended: attended,
      attendanceRate: attendances.length > 0 ? 
        ((attended / attendances.length) * 100).toFixed(1) : 0
    };
  };

  // ==================== MANUAL STATUS UPDATES ====================
  const updateAttendanceStatus = async (attendanceId, newStatus) => {
    if (!['present', 'late', 'absent'].includes(newStatus)) {
      throw new Error('Invalid status. Must be "present", "late", or "absent"');
    }
    
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ 
          status: newStatus
        })
        .eq('id', attendanceId);
      
      if (error) throw error;
      
      console.log(`✅ Updated attendance ${attendanceId} to ${newStatus}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating attendance status:', error);
      return { success: false, error: error.message };
    }
  };

  const markStudentAsLate = async (attendanceId) => {
    return updateAttendanceStatus(attendanceId, 'late');
  };

  const markStudentAsPresent = async (attendanceId) => {
    return updateAttendanceStatus(attendanceId, 'present');
  };

  const markStudentAsAbsent = async (attendanceId) => {
    return updateAttendanceStatus(attendanceId, 'absent');
  };

  // ==================== BULK OPERATIONS ====================
  const bulkUpdateStatus = async (attendanceIds, newStatus) => {
    if (!['present', 'late', 'absent'].includes(newStatus)) {
      throw new Error('Invalid status. Must be "present", "late", or "absent"');
    }
    
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ 
          status: newStatus
        })
        .in('id', attendanceIds);
      
      if (error) throw error;
      
      console.log(`✅ Bulk updated ${attendanceIds.length} records to ${newStatus}`);
      return { success: true, count: attendanceIds.length };
    } catch (error) {
      console.error('❌ Error bulk updating attendance:', error);
      return { success: false, error: error.message };
    }
  };

  // ==================== PUBLIC API ====================
  const changeClass = (className) => {
    setCurrentClass(className);
  };

  const refreshAttendance = () => {
    fetchAttendance(currentClass);
  };

  const getCurrentDisplayDate = () => {
    const phTime = getPhilippinesDateTime();
    return phTime.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFormattedTime = () => {
    const phTime = getPhilippinesDateTime();
    return phTime.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Manual triggers for testing/admin
  const triggerCreateTodaysDefaults = () => {
    return createDefaultAbsentRecordsForToday();
  };

  const triggerCleanDuplicates = () => {
    return cleanupDuplicateAttendance();
  };

  // Check if any students have scanned today (for edge function logic)
  const hasAnyAttendanceToday = () => {
    return attendances.some(a => 
      (a.status === 'present' || a.status === 'late') && a.time_in
    );
  };

  return {
    // State
    currentClass,
    attendances,
    loading,
    error,
    currentDate: getCurrentDisplayDate(),
    currentTime: getFormattedTime(),
    
    // Filtering
    changeClass,
    refreshAttendance,
    
    // Statistics
    getStatusCounts,
    getAttendanceSummary,
    
    // Status Management
    updateAttendanceStatus,
    markStudentAsLate,
    markStudentAsPresent,
    markStudentAsAbsent,
    bulkUpdateStatus,
    
    // Administrative
    triggerCreateTodaysDefaults,
    triggerCleanDuplicates,
    hasAnyAttendanceToday,
    
    // Filtered data helpers
    presentStudents: attendances.filter(a => a.status === 'present'),
    lateStudents: attendances.filter(a => a.status === 'late'),
    absentStudents: attendances.filter(a => a.status === 'absent'),
    arrivedStudents: attendances.filter(a => a.time_in !== null),
    departedStudents: attendances.filter(a => a.time_out !== null)
  };
};