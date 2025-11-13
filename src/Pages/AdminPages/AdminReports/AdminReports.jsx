import styles from './AdminReports.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faClipboard,
}from "@fortawesome/free-solid-svg-icons";

function AdminReports() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faClipboard} />}  label="Reports"></PageLabel>
    </main>
  );
}

export default AdminReports;