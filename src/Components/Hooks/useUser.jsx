// src/Hooks/useUser.jsx
import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../../lib/supabase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('UserProvider initialized - loading:', loading, 'user:', user);

  useEffect(() => {
    console.log('useUser effect running');
    
    const initUser = async () => {
      try {
        console.log('Fetching session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Session data:', session);
        console.log('Session error:', sessionError);
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('User found in session:', session.user);
          
          try {
            console.log('Fetching user data from users table...');
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            console.log('User data from table:', userData);
            console.log('User error:', userError);
            
            if (userError) {
              console.error('Error fetching user data:', userError);
              // Even if we can't get user data, we still have the auth user
              setUser({
                ...session.user,
                user_id: session.user.id,
                email: session.user.email,
              });
            } else {
              setUser({
                ...session.user,
                ...userData,
                user_id: session.user.id,
              });
            }
          } catch (fetchError) {
            console.error('Error in user fetch:', fetchError);
            // Fallback to just auth user
            setUser({
              ...session.user,
              user_id: session.user.id,
              email: session.user.email,
            });
          }
        } else {
          console.log('No session found');
          setUser(null);
        }
      } catch (err) {
        console.error('Error in initUser:', err);
        setError(err.message);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (session?.user) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          setUser({
            ...session.user,
            ...userData,
            user_id: session.user.id,
          });
        } catch (err) {
          console.error('Error fetching user on auth change:', err);
          setUser({
            ...session.user,
            user_id: session.user.id,
            email: session.user.email,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const contextValue = { 
    user, 
    loading, 
    error,
    isAuthenticated: !!user 
  };

  console.log('UserProvider returning context:', contextValue);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};