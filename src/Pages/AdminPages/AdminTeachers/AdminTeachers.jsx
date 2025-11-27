import styles from './AdminTeachers.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import TeacherTable from '../../../Components/Tables/TeacherTable/TeacherTable.jsx';
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faChalkboardUser,
}from "@fortawesome/free-solid-svg-icons";

function AdminTeachers() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faChalkboardUser} />}  label="Teachers"></PageLabel>
      <SectionLabel label="Teacher Records"></SectionLabel>
      <TeacherTable></TeacherTable>
    </main>
  );
}

export default AdminTeachers;