import { useState } from 'react';
import styles from './TeacherStudents.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import Button from "../../../Components/UI/Buttons/Button/Button.jsx";
import Input from '../../../Components/UI/Input/Input.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import TeacherStudentViewTable from '../../../Components/Tables/TeacherStudentViewTable/TeacherStudentViewTable.jsx';

function TeacherStudents() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faUsers} />} label="Students"></PageLabel>
      <SectionLabel label="Student Record"></SectionLabel>
      
      {/* For Teachers: Show read-only view instead of full admin table */}
      <TeacherStudentViewTable />
    </main>
  );
}

export default TeacherStudents;