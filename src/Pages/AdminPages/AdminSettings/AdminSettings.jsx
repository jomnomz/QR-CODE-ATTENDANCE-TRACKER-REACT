import styles from './AdminSettings.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import Button from '../../../Components/UI/Buttons/Button/Button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from "@fortawesome/free-solid-svg-icons";
import SettingsIcon from '@mui/icons-material/Settings';
import { supabase } from '../../../lib/supabase.js';
import { useNavigate } from "react-router-dom";

function AdminSettings() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate("/");   
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <main className={styles.main}>
      <PageLabel icon={<SettingsIcon sx={{ fontSize: 50, mb: -0.7 }}  />}  label="Settings"></PageLabel>
      <Button 
        label="Logout" 
        onClick={handleLogout}
      ></Button>
    </main>
  );
}

export default AdminSettings;
