import { useEffect, useState } from 'react';
import LoginForm from '../../Components/Forms/LoginForm/LoginForm';
import styles from './LoginPage.module.css';
import stoninoschool from '../../assets/sto nino school.png';
import { supabase } from '../../lib/supabase';

const LoginPage = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkIfAlreadyLoggedIn();
  }, []);

  const checkIfAlreadyLoggedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (userData?.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (userData?.role === 'teacher') {
        window.location.href = '/teacher/dashboard';
      }
    } else {
      setCheckingAuth(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: 'white',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center'  
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className={styles.body}
      style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${stoninoschool})` }}
    >
      <div className={styles.tagLineContainer}>
        <div className={styles.tagLine}>
          <div><h1>Welcome!</h1></div>
          <div><h6>Login to your account to continue.</h6></div>
        </div>
      </div>

      <div className={styles.formContainer}>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;