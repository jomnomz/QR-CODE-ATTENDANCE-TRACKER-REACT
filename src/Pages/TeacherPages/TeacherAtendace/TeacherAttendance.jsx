import styles from './TeacherAttendance.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faClipboardCheck,
}from "@fortawesome/free-solid-svg-icons";

function TeacherAttendance() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faClipboardCheck} />}  label="Attendance"></PageLabel>
    </main>
  );
}

export default TeacherAttendance;