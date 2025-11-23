import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setShouldRedirect(true);
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('role, status')
        .eq('user_id', user.id)
        .single();

      if (error || !userData || userData.status !== 'active') {
        setShouldRedirect(true);
        return;
      }

      if (requiredRole && userData.role !== requiredRole) {
        setShouldRedirect(true);
        return;
      }

      // If we get here, auth is successful
      setShouldRedirect(false);
    } catch (error) {
      setShouldRedirect(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: 'white' // optional: make it white too
    }}>
      <div>Loading...</div>
    </div>
  );
}

  if (shouldRedirect) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;