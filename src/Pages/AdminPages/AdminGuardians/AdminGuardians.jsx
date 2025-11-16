import styles from './AdminGuardians.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import TestSupabase from '../../../Components/Test/TestSubpabase/TestSupabase.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faPersonBreastfeeding,
}from "@fortawesome/free-solid-svg-icons";

function AdminGuardians() {
  return (
    <>
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faPersonBreastfeeding} />}  label="Guardians"></PageLabel>
      <TestSupabase></TestSupabase>
    </main>
    </>
  );
}

export default AdminGuardians;