import { useState } from 'react';
import styles from './AdminLayout.module.css';
import NavBar from '../../NavBars/NavBar/NavBar.jsx';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <NavBar 
        userType="admin"
        onCollapseChange={(collapsed) => setIsCollapsed(collapsed)}
      />

      <div 
        className={styles.mainContent}
        style={{ 
          marginLeft: isCollapsed ? "70px" : "40px",
          width: isCollapsed ? "calc(100% - 70px)" : "calc(100% - 40px)"
        }} 
      >
        <Outlet />
      </div>
    </>
  );
};

export default AdminLayout;