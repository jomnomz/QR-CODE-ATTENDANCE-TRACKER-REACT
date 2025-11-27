import styles from './AdminAttendance.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import AttendanceTable from '../../../Components/Tables/AttendanceTable/AttendanceTable.jsx';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

function AdminAttendance() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<AssignmentTurnedInIcon sx={{ fontSize: 50, mb: -0.7 }}  />}  label="Attendance"></PageLabel>
      <SectionLabel label="Attendance Records"></SectionLabel>
      <AttendanceTable></AttendanceTable>
    </main>
  );
}

export default AdminAttendance;