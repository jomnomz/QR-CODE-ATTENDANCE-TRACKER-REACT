import styles from './TeacherSettings.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import Button from '../../../Components/UI/Buttons/Button/Button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { supabase } from '../../../lib/supabase.js';

function TeacherSettings() {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faGear} />} label="Settings"></PageLabel>
      <Button 
        label="Logout" 
        onClick={handleLogout}
      ></Button>
    </main>
  );
}

export default TeacherSettings;