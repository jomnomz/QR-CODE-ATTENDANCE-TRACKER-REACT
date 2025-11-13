import styles from './AdminMessages.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faCommentSms,
}from "@fortawesome/free-solid-svg-icons";

function AdminMessages() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faCommentSms} />}  label="Messages"></PageLabel>
    </main>
  );
}

export default AdminMessages;