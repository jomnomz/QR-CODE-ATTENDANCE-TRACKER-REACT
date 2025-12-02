import { useState, useEffect } from 'react';
import { StudentService, GuardianService } from '../../Utils/EntityService'; 
import { supabase } from '../../lib/supabase';

const getStoredGrade = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentGrade');
    // Return stored value if exists, otherwise default to 'all'
    return stored || 'all'; // Changed from '7' to 'all'
  }
  return 'all'; // Changed from '7' to 'all'
};

const setStoredGrade = (grade) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentGrade', grade);
  }
};

export const useStudents = () => {
  const [currentClass, setCurrentClass] = useState(() => getStoredGrade());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create an instance of StudentService
  const studentService = new StudentService();

  const fetchStudents = async (grade) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching students for grade: ${grade}`);
      
      if (grade === 'all') {
        // Fetch all students when "All" is selected
        const data = await studentService.fetchAll();
        console.log(`✅ Fetched all students: ${data.length} records`);
        setStudents(data);
      } else {
        // Fetch by specific grade
        const data = await studentService.fetchByGrade(grade);
        console.log(`✅ Fetched grade ${grade} students: ${data.length} records`);
        setStudents(data);
      }
    } catch (err) {
      console.error('❌ Error fetching students:', err);
      setError('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    console.log('🚀 useStudents hook initialized, fetching initial data...');
    fetchStudents(currentClass);
  }, []); // Empty dependency array = run once on mount

  // Fetch when currentClass changes
  useEffect(() => {
    console.log(`🔄 Current class changed to: ${currentClass}, fetching students...`);
    fetchStudents(currentClass);
  }, [currentClass]);

  useEffect(() => {
    console.log('🔔 Setting up real-time INSERT subscription for grade:', currentClass);
    
    const subscription = supabase
      .channel('students-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          console.log('🆕 REAL-TIME INSERT: New student detected:', payload.new);
          
          // Check if the new student matches current filter
          if (currentClass === 'all' || payload.new.grade === currentClass) {
            console.log('✅ Adding new student to current view');
            setStudents(prevStudents => {
              const exists = prevStudents.some(s => s.id === payload.new.id);
              if (!exists) {
                return [...prevStudents, payload.new];
              }
              return prevStudents;
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentClass]);

  const changeClass = (className) => {
    setCurrentClass(className);
    setStoredGrade(className);
  };

  const refetch = () => {
    fetchStudents(currentClass);
  };

  return {
    currentClass,
    entities: students,
    loading,
    error,
    changeClass,
    refetch,
    setEntities: setStudents
  };
};

export const useGuardians = () => {
  const [currentClass, setCurrentClass] = useState(() => getStoredGrade()); // FIXED: Added = here
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGuardians = async (grade) => {
    try {
      setLoading(true);
      setError(null);
      const data = grade === 'all' 
        ? await GuardianService.fetchAll()
        : await GuardianService.fetchByGrade(grade);
      setGuardians(data);
    } catch (err) {
      console.error('Error fetching guardians:', err);
      setError('Failed to load guardians');
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Add initial fetch
  useEffect(() => {
    fetchGuardians(currentClass);
  }, [currentClass]);

  const changeClass = (className) => {
    setCurrentClass(className);
    setStoredGrade(className);
  };

  const refetch = () => {
    fetchGuardians(currentClass);
  };

  return {
    currentClass,
    entities: guardians,
    loading,
    error,
    changeClass,
    refetch,
    setEntities: setGuardians
  };
};