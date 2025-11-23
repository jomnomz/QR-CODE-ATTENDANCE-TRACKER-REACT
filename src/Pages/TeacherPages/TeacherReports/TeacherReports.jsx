import styles from './TeacherReports.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faClipboard,
}from "@fortawesome/free-solid-svg-icons";

function TeacherReports() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faClipboard} />}  label="Reports"></PageLabel>
    </main>
  );
}

export default TeacherReports;