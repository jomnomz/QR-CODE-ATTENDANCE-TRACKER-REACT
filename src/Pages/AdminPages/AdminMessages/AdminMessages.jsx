import styles from './AdminMessages.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import MessageTable from '../../../Components/Tables/MessageTable/MessageTable.jsx';
import MessageIcon from '@mui/icons-material/Message';

function AdminMessages() {
  return (
    <main className={styles.main}>
      <PageLabel icon={<MessageIcon sx={{ fontSize: 50, mb: -1.5 }} />}   label="Messages"></PageLabel>
      <SectionLabel label="Message Records"></SectionLabel>
      <MessageTable></MessageTable>
    </main>
  );
}

export default AdminMessages;