import styles from './AdminReports.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import ReportTable from '../../../Components/Tables/ReportTable/ReportTable.jsx';
import AssignmentIcon from '@mui/icons-material/Assignment';

function AdminReports() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<AssignmentIcon sx={{ fontSize: 50, mb: -0.7 }}  />}  label="Reports"></PageLabel>
      <SectionLabel label="Attendance Reports"></SectionLabel>
      <ReportTable></ReportTable>
    </main>
  );
}

export default AdminReports;