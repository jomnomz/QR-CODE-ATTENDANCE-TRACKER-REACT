import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

function TestSupabase() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test 1: Check if we can connect
        console.log('Testing Supabase connection...');
        
        // Test 2: Try to fetch students
        const { data, error } = await supabase
          .from('students')
          .select('*');
        
        if (error) {
          console.error('❌ Supabase error:', error);
        } else {
          console.log('✅ Supabase connected! Students:', data);
          setStudents(data);
        }
      } catch (error) {
        console.error('❌ Connection failed:', error);
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  if (loading) return <div>Testing database connection...</div>;

  return (
    <div>
      <h2>Database Connection Test</h2>
      <p>Students in database: {students.length}</p>
      {students.map(student => (
        <div key={student.id}>
          {student.first_name} {student.last_name}
        </div>
      ))}
    </div>
  );
}

export default TestSupabase;