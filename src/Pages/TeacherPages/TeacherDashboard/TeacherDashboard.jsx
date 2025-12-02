import styles from './TeacherDashboard.module.css'
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
  faChartSimple,
  faUsers,
  faPersonBreastfeeding,
  faCommentSms,
  faChalkboardUser,
} from "@fortawesome/free-solid-svg-icons";

function TeacherDashboard() {
  const { data: students, loading: studentsLoading } = useSupabaseData('students');

  const isLoading = studentsLoading;

  if (isLoading) return <div>Loading dashboard...</div>;

  return (
    <>
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <PageLabel icon={<FontAwesomeIcon icon={faChartSimple} />} label="Dashboard"></PageLabel>
          <DateTodayLabel></DateTodayLabel>    
        </div>
        <SectionLabel label="Registered"></SectionLabel>
        <div className={styles.cards}>
          <DashboardCard 
            icon={<FontAwesomeIcon icon={faUsers} />} 
            label="Students" 
            number={students.length} 
            colors={{bg: '#FFB025'}}
          ></DashboardCard>
          <DashboardCard 
            icon={<FontAwesomeIcon icon={faPersonBreastfeeding} />} 
            label="Guardians" 
            number={1000} 
            colors={{bg: '#3166e1ff'}}
          ></DashboardCard>
          <DashboardCard 
            icon={<FontAwesomeIcon icon={faChalkboardUser} />} 
            label="Teachers" 
            number={1000} 
            colors={{bg: '#4EB99F'}}
          ></DashboardCard>
          <DashboardCard 
            icon={<FontAwesomeIcon icon={faCommentSms} />} 
            label="SMS Sent Today" 
            number={1000} 
            colors={{bg: '#058588'}}
          ></DashboardCard>
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

export default TeacherDashboard;