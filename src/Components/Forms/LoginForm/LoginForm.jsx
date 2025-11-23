import styles from './LoginForm.module.css'
import Button from '../../UI/Buttons/Button/Button';
import stonino from '../../../assets/sto nino.png';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

function LoginForm(){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Sign in with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
            });

            if (error) throw error;

            // Get user role from YOUR database
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, status')
                .eq('user_id', data.user.id)
                .single();

            if (userError || !userData) {
                throw new Error('User profile not found');
            }

            if (userData.status !== 'active') {
                throw new Error('Account pending approval');
            }

            console.log('Login successful:', data);
            
            // Redirect based on ACTUAL role from database
            if (userData.role === 'admin') {
                window.location.href = '/admin/dashboard';
            } else if (userData.role === 'teacher') {
                window.location.href = '/teacher/dashboard';
            } else {
                window.location.href = '/';
            }

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.logo}>
                <img src={stonino} alt="Stonino" />
            </div>
            
            <input 
                className={styles.input} 
                type="text" 
                name="username" 
                placeholder="Email" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
            />
            <input 
                className={styles.input} 
                type="password" 
                name="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
            />

            {error && <div className={styles.error}>{error}</div>}

            <Button 
                label={loading ? "Logging in..." : "Login"} 
                width="xxl" 
                type="submit"
                disabled={loading}
            />
        </form>
    );
}

export default LoginForm;