import styles from './AdminGuardians.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faPersonBreastfeeding,
}from "@fortawesome/free-solid-svg-icons";

function AdminGuardians() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faPersonBreastfeeding} />}  label="Guardians"></PageLabel>
    </main>
  );
}

export default AdminGuardians;