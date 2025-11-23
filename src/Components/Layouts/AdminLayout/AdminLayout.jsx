import styles from './AdminLayout.module.css'
import NavBar from '../../NavBars/NavBar/NavBar.jsx'
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <>
      <div>
        <NavBar userType="admin"/>
      </div>
      <div className={styles.mainContent}>
        <Outlet />
      </div>
    </>
  );
};

export default AdminLayout;