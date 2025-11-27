import styles from './AdminGuardians.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import GuardianTable from '../../../Components/Tables/GuardianTable/GuardianTable.jsx';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';

function AdminGuardians() {
  return (
    <>
    <main className={styles.main}>
      <PageLabel icon={<FamilyRestroomIcon sx={{ fontSize: 50, mb: -0.7 }} />}  label="Guardians"></PageLabel>
      <SectionLabel label="Guardian Records"></SectionLabel>
      <GuardianTable></GuardianTable>
    </main>
    </>
  );
}

export default AdminGuardians;