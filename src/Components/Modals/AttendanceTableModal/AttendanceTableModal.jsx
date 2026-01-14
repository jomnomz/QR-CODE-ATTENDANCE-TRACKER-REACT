import React from 'react';
import Modal from '../Modal/Modal';
import TeacherAttendanceTable from '../../Tables/TeacherAttendanceTable/TeacherAttendanceTable';
import styles from './AttendanceTableModal.module.css';

const AttendanceTableModal = ({ 
  isOpen, 
  onClose, 
  className,
  subject,
  schoolYear 
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="xxxl"
      className={styles.modal}
    >
      <div className={styles.modalContent}>
        <TeacherAttendanceTable
          className={className}
          subject={subject}
          schoolYear={schoolYear}
          onEditClick={(studentId, attendanceData) => {
            console.log('Edit clicked:', studentId, attendanceData);
            // Handle edit logic here or pass to parent
          }}
        />
      </div>
    </Modal>
  );
};

export default AttendanceTableModal;