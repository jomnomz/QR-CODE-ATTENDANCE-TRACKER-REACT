import { useState, useEffect } from 'react';
import { StudentService, GuardianService, TeacherService } from '../../Utils/EntityService';  
import { supabase } from '../../lib/supabase';

const getStoredGrade = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentGrade');
    return stored || 'all';
  }
  return 'all';
};

const setStoredGrade = (grade) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentGrade', grade);
  }
};

const getStoredFilter = (entityType) => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`${entityType}Filter`) || 'all';
  }
  return 'all';
};

const setStoredFilter = (entityType, filter) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${entityType}Filter`, filter);
  }
};

export const useStudents = () => {
  const [currentClass, setCurrentClass] = useState(() => getStoredGrade());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const studentService = new StudentService();

  const fetchStudents = async (grade) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching students for grade: ${grade}`);
      
      if (grade === 'all') {
        const data = await studentService.fetchAll();
        console.log(`✅ Fetched all students: ${data.length} records`);
        setStudents(data);
      } else {
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

  useEffect(() => {
    console.log('🚀 useStudents hook initialized, fetching initial data...');
    fetchStudents(currentClass);
  }, []);

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
  const [currentClass, setCurrentClass] = useState(() => getStoredGrade());
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const guardianService = new GuardianService();

  const fetchGuardians = async (grade) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = grade === 'all' 
        ? await guardianService.fetchAll()
        : await guardianService.fetchByGrade(grade);
      
      setGuardians(data);
    } catch (err) {
      console.error('Error fetching guardians:', err);
      setError('Failed to load guardians');
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  };

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

export const useTeachers = () => {
  const [currentFilter, setCurrentFilter] = useState(() => getStoredFilter('teacher'));
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const teacherService = new TeacherService();

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching teachers...`);
      const data = await teacherService.fetchAll();
      console.log(`✅ Fetched ${data.length} teachers`);
      setTeachers(data);
    } catch (err) {
      console.error('❌ Error fetching teachers:', err);
      setError('Failed to load teachers');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 useTeachers hook initialized');
    fetchTeachers();
  }, []);

  useEffect(() => {
    console.log('🔔 Setting up real-time subscription for teachers');
    
    const subscription = supabase
      .channel('teachers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teachers',
        },
        (payload) => {
          console.log('🆕 REAL-TIME INSERT: New teacher detected:', payload.new);
          setTeachers(prevTeachers => {
            const exists = prevTeachers.some(t => t.id === payload.new.id);
            if (!exists) {
              return [...prevTeachers, payload.new];
            }
            return prevTeachers;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teachers',
        },
        (payload) => {
          console.log('🔄 REAL-TIME UPDATE: Teacher updated:', payload.new);
          setTeachers(prevTeachers =>
            prevTeachers.map(teacher =>
              teacher.id === payload.new.id ? payload.new : teacher
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'teachers',
        },
        (payload) => {
          console.log('🗑️ REAL-TIME DELETE: Teacher removed:', payload.old.id);
          setTeachers(prevTeachers =>
            prevTeachers.filter(teacher => teacher.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const changeFilter = (filterName) => {
    setCurrentFilter(filterName);
    setStoredFilter('teacher', filterName);
  };

  const refetch = () => {
    fetchTeachers();
  };

  return {
    currentFilter,
    entities: teachers,
    loading,
    error,
    changeFilter,
    refetch,
    setEntities: setTeachers
  };
};