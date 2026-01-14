import { useState, useEffect } from 'react';
import styles from './TeacherAttendance.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import AttendanceCard from '../../../Components/UI/Cards/AttendanceCard/AttendanceCard.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from '../../../Components/Authentication/AuthProvider/AuthProvider.jsx';

function TeacherAttendance() {
  const { user, profile, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && user && profile) {
      fetchTeacherClasses();
    }
  }, [authLoading, user, profile]);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Starting fetchTeacherClasses');
      
      if (!user || !profile) {
        setError('Please log in to view your classes');
        setLoading(false);
        return;
      }
      
      if (profile.role !== 'teacher') {
        setError('This page is for teachers only');
        setLoading(false);
        return;
      }
      
      // Get teacher ID
      const teacherId = await getTeacherId();
      
      if (!teacherId) {
        setError('Teacher account not found. Please contact administration.');
        setLoading(false);
        return;
      }
      
      console.log(`✅ Got teacher ID: ${teacherId}`);
      await fetchTeacherClassesById(teacherId);
      
    } catch (err) {
      console.error('❌ Error in fetchTeacherClasses:', err);
      setError('Failed to load classes. Please try again.');
      setLoading(false);
    }
  };

  const getTeacherId = async () => {
    try {
      // Use the proxy - relative URL
      if (user?.id) {
        console.log(`🔍 Trying auth user ID: ${user.id}`);
        const response = await fetch(
          `/api/teacher-invite/get-teacher-id-by-auth?authUserId=${user.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include' // Important for cookies/sessions
          }
        );
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Auth ID response:', data);
          
          if (data.success) {
            console.log(`✅ Found teacher via auth ID: ${data.teacherId}`);
            return data.teacherId;
          }
        } else {
          console.log('❌ Auth ID failed, trying email...');
        }
      }
      
      // Fallback to email
      if (profile?.email) {
        console.log(`🔍 Falling back to email: ${profile.email}`);
        const response = await fetch(
          `/api/teacher-invite/get-teacher-id-by-email?email=${encodeURIComponent(profile.email)}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Email response:', data);
          
          if (data.success) {
            console.log(`✅ Found teacher via email: ${data.teacherId}`);
            return data.teacherId;
          }
        }
      }
      
      console.log('❌ No teacher found');
      return null;
      
    } catch (err) {
      console.error('❌ Error getting teacher ID:', err.message);
      return null;
    }
  };

  const fetchTeacherClassesById = async (teacherId) => {
    try {
      console.log(`📚 Fetching classes for teacher ID: ${teacherId}`);
      
      const response = await fetch(`/api/teacher-invite/teacher-classes/${teacherId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Classes response:', data);
      
      if (data.success) {
        setClasses(data.classes);
        console.log(`✅ Loaded ${data.classes.length} classes`);
      } else {
        setError(data.error || 'Failed to load classes');
      }
    } catch (err) {
      console.error('❌ Error fetching classes:', err.message);
      setError(err.message || 'Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for when a card is clicked
  const handleCardClick = (className) => {
    console.log(`Card clicked: ${className}`);
    const selectedClass = classes.find(cls => cls.className === className);
    if (selectedClass) {
      console.log('Selected class:', selectedClass);
      localStorage.setItem('selectedClass', JSON.stringify(selectedClass));
      // You can navigate to attendance page here
      // Example: window.location.href = `/attendance/${selectedClass.id}`;
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <main className={styles.main}>
        <PageLabel 
          icon={<FontAwesomeIcon icon={faClipboardCheck} />}  
          label="Daily Attendance Record for Each Class"
        />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading authentication...</p>
        </div>
      </main>
    );
  }

  // Show loading while fetching classes
  if (loading) {
    return (
      <main className={styles.main}>
        <PageLabel 
          icon={<FontAwesomeIcon icon={faClipboardCheck} />}  
          label="Daily Attendance Record for Each Class"
        />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your classes...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <PageLabel 
          icon={<FontAwesomeIcon icon={faClipboardCheck} />}  
          label="Daily Attendance Record for Each Class"
        />
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button onClick={fetchTeacherClasses} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <PageLabel 
        icon={<FontAwesomeIcon icon={faClipboardCheck} />}  
        label="Daily Attendance Record for Each Class"
      />
      
      {classes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <h3>No Classes Assigned</h3>
          <p>You don't have any classes assigned yet.</p>
          <p>Contact the school administration to get your teaching assignments.</p>
          <button onClick={fetchTeacherClasses} className={styles.retryButton}>
            Refresh
          </button>
        </div>
      ) : (
        <div className={styles.classesGrid}>
          {classes.map((classItem) => (
            <AttendanceCard
              key={classItem.id}
              className={classItem.className}
              subject={classItem.subject}
              schoolYear={classItem.schoolYear}
              initialColor={classItem.initialColor}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default TeacherAttendance;