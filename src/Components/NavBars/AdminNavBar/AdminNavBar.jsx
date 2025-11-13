import styles from './AdminNavBar.module.css'
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faChartSimple,
        faUsers,
        faPersonBreastfeeding,
        faCommentSms,
        faClipboardCheck,
        faClipboard,
        faPlus,
        faChalkboardUser,
        faGear,
        faBars,
} from "@fortawesome/free-solid-svg-icons";

function AdminNavBar(){

  const location = useLocation(); // Get current route

  // Helper function to check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  }

    return(
        <nav>
            <div className={styles.admin}>
                <button className={styles.toggleHide}><FontAwesomeIcon icon={faBars} className={styles.toggleHideIcon}/></button>
                <p>Welcome!</p>
                <p>Admin Huge Jashley Novilla</p>
            </div>

            <div className={styles.sideBar}>
                <Link to="/Dashboard" className={`${styles.sideBarButtons} ${isActive('/Dashboard') ? styles.active : ''}`}><FontAwesomeIcon icon={faChartSimple} className={styles.sideBarButtonsIcons}/><span>Dashboard</span></Link>
                <Link to="/Students" className={`${styles.sideBarButtons} ${isActive('/Students') ? styles.active : ''}`}><FontAwesomeIcon icon={faUsers} className={styles.sideBarButtonsIcons}/><span>Students</span></Link>
                <Link to="/Guardians" className={`${styles.sideBarButtons} ${isActive('/Guardians') ? styles.active : ''}`}><FontAwesomeIcon icon={faPersonBreastfeeding} className={styles.sideBarButtonsIcons}/><span>Guardians</span></Link>
                <Link to="/Messages" className={`${styles.sideBarButtons} ${isActive('/Messages') ? styles.active : ''}`}><FontAwesomeIcon icon={faCommentSms} className={styles.sideBarButtonsIcons}/><span>Messages</span></Link>
                <Link to="/Attendance" className={`${styles.sideBarButtons} ${isActive('/Attendance') ? styles.active : ''}`}><FontAwesomeIcon icon={faClipboardCheck} className={styles.sideBarButtonsIcons}/><span>Attendance</span></Link>
                <Link to="/Reports" className={`${styles.sideBarButtons} ${isActive('/Reports') ? styles.active : ''}`}><FontAwesomeIcon icon={faClipboard} className={styles.sideBarButtonsIcons}/><span>Reports</span></Link>
                <Link to="/CreateUserAcc" className={`${styles.sideBarButtons} ${isActive('/CreateUserAcc') ? styles.active : ''}`}><FontAwesomeIcon icon={faPlus} className={styles.sideBarButtonsIcons}/><span>Accounts</span></Link>
                <Link to="/Teachers" className={`${styles.sideBarButtons} ${isActive('/Teachers') ? styles.active : ''}`}><FontAwesomeIcon icon={faChalkboardUser} className={styles.sideBarButtonsIcons}/><span>Teachers</span></Link>
                <Link to="/Settings" className={`${styles.sideBarButtons} ${isActive('/Settings') ? styles.active : ''}`}><FontAwesomeIcon icon={faGear} className={styles.sideBarButtonsIcons}/><span>Settings</span></Link>
            </div>
        </nav>
    )
}

export default AdminNavBar