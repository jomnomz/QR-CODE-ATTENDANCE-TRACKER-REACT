import styles from './NavBar.module.css'
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faChartSimple,
        faUsers,
        faPersonBreastfeeding,
        faCommentSms,
        faClipboardCheck,
        faClipboard,
        faChalkboardUser,
        faGear,
        faBars,
} from "@fortawesome/free-solid-svg-icons";

function NavBar({ userType = 'admin' }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === `/${userType}${path}`;
  }

  const navItems = {
    admin: [
      { path: '/dashboard', icon: faChartSimple, label: 'Dashboard' },
      { path: '/students', icon: faUsers, label: 'Students' },
      { path: '/guardians', icon: faPersonBreastfeeding, label: 'Guardians' },
      { path: '/messages', icon: faCommentSms, label: 'Messages' },
      { path: '/attendance', icon: faClipboardCheck, label: 'Attendance' },
      { path: '/teachers', icon: faChalkboardUser, label: 'Teachers' },
      { path: '/reports', icon: faClipboard, label: 'Reports' },
      { path: '/settings', icon: faGear, label: 'Settings' }
    ],
    teacher: [
      { path: '/dashboard', icon: faChartSimple, label: 'Dashboard' },
      { path: '/attendance', icon: faClipboardCheck, label: 'Attendance' },
      { path: '/students', icon: faUsers, label: 'Students' },
      { path: '/reports', icon: faClipboard, label: 'Reports' },
      { path: '/settings', icon: faGear, label: 'Settings' }
    ]
  };

  const currentNavItems = navItems[userType] || navItems.admin;

  return (
    <nav>
      <div className={styles.admin}>
        <button className={styles.toggleHide}>
          <FontAwesomeIcon icon={faBars} className={styles.toggleHideIcon}/>
        </button>
        <p>Welcome!</p>
        <p>{userType === 'admin' ? 'Admin Huge Jashley Novilla' : 'Teacher Name'}</p>
      </div>

      <div className={styles.sideBar}>
        {currentNavItems.map(item => (
          <Link 
            key={item.path}
            to={`/${userType}${item.path}`}
            className={`${styles.sideBarButtons} ${isActive(item.path) ? styles.active : ''}`}
          >
            <FontAwesomeIcon icon={item.icon} className={styles.sideBarButtonsIcons}/>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default NavBar