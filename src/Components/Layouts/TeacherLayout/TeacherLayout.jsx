import styles from './TeacherLayout.module.css'
import NavBar from '../../NavBars/NavBar/NavBar.jsx'
import { Outlet } from 'react-router-dom';

const TeacherLayout = () => {
  return (
    <>
      <div>
        <NavBar userType="teacher"/>
      </div>
      <div className={styles.mainContent}>
        <Outlet />
      </div>
    </>
  );
};

export default TeacherLayout;