import { useState } from 'react' 
import styles from './AdminStudents.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import FileUploadModal from "../../../Components/Modals/FileUploadModal/FileUploadModal.jsx";
import CreateButton from "../../../Components/UI/Buttons/CreateButton/CreateButton.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faUsers,
}from "@fortawesome/free-solid-svg-icons";


function AdminStudents() {

  const [isOpen, setIsOpen] = useState(false)

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faUsers} />}  label="Students"></PageLabel>
      <CreateButton onClick={() => {setIsOpen(true);}}></CreateButton>
      <FileUploadModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </main>
  );
}

export default AdminStudents;