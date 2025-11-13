import styles from './AdminSettings.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faGear,
}from "@fortawesome/free-solid-svg-icons";

function AdminSettings() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faGear} />}  label="Settings"></PageLabel>
    </main>
  );
}

export default AdminSettings;