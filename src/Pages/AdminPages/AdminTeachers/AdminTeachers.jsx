import styles from './AdminTeachers.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faChalkboardUser,
}from "@fortawesome/free-solid-svg-icons";

function AdminTeachers() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faChalkboardUser} />}  label="Teachers"></PageLabel>
    </main>
  );
}

export default AdminTeachers;