import styles from './AdminDashboard.module.css'
import BarGraph from "../../../Components/Charts/BarGraph/BarGraph.jsx";
import LineChart from "../../../Components/Charts/LineChart/LineChart.jsx";
import PieChart from "../../../Components/Charts/PieChart/PieChart.jsx";
import DashboardCard from "../../../Components/UI/Cards/DashboardCard/DashboardCard.jsx";
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import DateTodayLabel from "../../../Components/UI/Labels/DateTodayLabel/DateTodayLabel.jsx";
import { useSupabaseData } from '../../../Components/Hooks/fetchData.js'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faChalkboardUser,
  faUserCheck,
  faComments,
  faUserGraduate,
  faUserShield
} from "@fortawesome/free-solid-svg-icons";

import DashboardIcon from '@mui/icons-material/Dashboard';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import MessageIcon from '@mui/icons-material/Message';
import SchoolIcon from '@mui/icons-material/School';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

function AdminDashboard() {
  // Fetch students data
  const { data: students, loading: studentsLoading } = useSupabaseData('students');
  
  // Fetch teachers data
  const { data: teachers, loading: teachersLoading } = useSupabaseData('teachers');

  // Count unique guardians (assuming each student has one guardian)
  const guardianCount = students?.reduce((unique, student) => {
    const guardianKey = `${student.guardian_first_name}-${student.guardian_last_name}-${student.guardian_phone_number}`;
    if (!unique.has(guardianKey)) {
      unique.add(guardianKey);
    }
    return unique;
  }, new Set()).size;

  // Count teachers with accounts (status = 'active')
  const teachersWithAccounts = teachers?.filter(teacher => teacher.status === 'active').length || 0;

  // Total teachers count
  const totalTeachers = teachers?.length || 0;

  const isLoading = studentsLoading || teachersLoading;

  if (isLoading) return <div>Loading dashboard...</div>;

  return (
    <>
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <PageLabel icon={<DashboardIcon sx={{ fontSize: 50, mb: -0.7 }}  />} label="Dashboard"></PageLabel>
          <DateTodayLabel></DateTodayLabel>    
        </div>
        <SectionLabel label="Registered Users"></SectionLabel>
        <div className={styles.cards}>
          {/* Students Card */}
          <DashboardCard  
            colors={{bg: '#FF6B6B'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faUserGraduate} /> Students
              </div>
              <div className={styles.number}>{students?.length || 0}</div>
            </div>
          </DashboardCard>

          {/* Guardians Card */}
          <DashboardCard  
            colors={{bg: '#4ECDC4'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faUserShield} /> Guardians
              </div>
              <div className={styles.number}>{guardianCount || 0}</div>
            </div>
          </DashboardCard>

          {/* Total Teachers Card */}
          <DashboardCard 
            colors={{bg: '#FFD166'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faChalkboardUser} /> Total Teachers
              </div>
              <div className={styles.number}>{totalTeachers}</div>             
            </div>
          </DashboardCard>

          {/* Teachers with Accounts Card */}
          <DashboardCard 
            colors={{bg: '#06D6A0'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faUserCheck} /> Teacher Accounts
              </div>
              <div className={styles.number}>{teachersWithAccounts}</div>             
            </div>
          </DashboardCard>

          {/* SMS Sent Today Card */}
          <DashboardCard 
            colors={{bg: '#118AB2'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <MessageIcon sx={{ mb: -0.5 }}/> SMS Sent Today
              </div>
              <div className={styles.number}>{1000}</div>             
            </div>
          </DashboardCard>
        </div>
        <SectionLabel label="Statistics"></SectionLabel>
        <div className={styles.charts}>
          <BarGraph></BarGraph>
          <PieChart></PieChart>
          <LineChart></LineChart>
        </div>
      </main>
    </>
  )
}

export default AdminDashboard;