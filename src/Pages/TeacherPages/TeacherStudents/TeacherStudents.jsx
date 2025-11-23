import { useState } from 'react' 
import styles from './TeacherStudents.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import FileUploadModal from "../../../Components/Modals/FileUploadModal/FileUploadModal.jsx";
import Button from "../../../Components/UI/Buttons/Button/Button.jsx";
import StudentTable from '../../../Components/Tables/StudentTable/StudentTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faUsers,
}from "@fortawesome/free-solid-svg-icons";


function TeacherStudents() {

  const [isOpen, setIsOpen] = useState(false)

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faUsers} />}  label="Students"></PageLabel>
      <SectionLabel label="Student Record"></SectionLabel>
      <div className={styles.top}>
        <Button height="md" width="sm" label="Create" onClick={() => {setIsOpen(true);}}></Button>
        <Input placeholder="Search Name"></Input>
      </div>
      <FileUploadModal isOpen={isOpen} type="student" onClose={() => setIsOpen(false)} />
      <StudentTable></StudentTable>
    </main>
  );
}

export default TeacherStudents;