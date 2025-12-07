import { useState, useCallback } from 'react';
import styles from './AdminTeachers.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import TeacherTable from '../../../Components/Tables/TeacherTable/TeacherTable.jsx';
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import Input from '../../../Components/UI/Input/Input.jsx';
import Button from '../../../Components/UI/Buttons/Button/Button.jsx';
import FileUploadModal from '../../../Components/Modals/FileUploadModal/FileUploadModal.jsx';
import DeleteTeacherModal from '../../../Components/Modals/DeleteTeacherModal/DeleteTeacherModal.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChalkboardUser } from "@fortawesome/free-solid-svg-icons";
import { useTeachers } from '../../../Components/Hooks/useEntities.js'; 
import { TeacherService } from '../../../Utils/EntityService.js'; 
import { useToast } from '../../../Components/Toast/ToastContext/ToastContext.jsx'; 

function AdminTeachers() {
  const { success, error: toastError } = useToast();
  const { entities: teachers, refetch: refreshTeachers } = useTeachers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState('single');
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const teacherService = new TeacherService();

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectedTeachersUpdate = (selected) => {
    setSelectedTeachers(selected);
  };

  const handleTeacherDataUpdate = (teacherData) => {
    console.log('Teachers updated:', teacherData.length);
  };

  const handleUploadSuccess = useCallback((newTeachers) => {
    console.log('🆕 Teachers uploaded:', newTeachers);
    refreshTeachers();
    setRefreshTrigger(prev => prev + 1);
  }, [refreshTeachers]);

  const handleSingleDeleteClick = (teacher) => {
    setDeleteModalMode('single');
    setTeacherToDelete(teacher);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedTeachers.length > 0) {
      setDeleteModalMode('bulk');
      setIsDeleteModalOpen(true);
    }
  };

  const deleteSingleTeacherAPI = async (teacherId) => {
    try {
      console.log('🔄 Deleting teacher ID:', teacherId);
      await teacherService.delete(teacherId);
      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting teacher:', err);
      throw new Error(`Failed to delete teacher: ${err.message}`);
    }
  };

  const deleteMultipleTeachersAPI = async (teacherIds) => {
    try {
      console.log('🔄 Deleting multiple teachers:', teacherIds);
      
      for (const teacherId of teacherIds) {
        await teacherService.delete(teacherId);
      }
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error bulk deleting teachers:', err);
      throw new Error(`Failed to delete teachers: ${err.message}`);
    }
  };

  const handleConfirmDelete = async (teacherIdOrIds) => {
    console.log('DELETE FUNCTION CALLED! Mode:', deleteModalMode, 'IDs:', teacherIdOrIds);
    setIsDeleting(true);
    
    try {
      if (deleteModalMode === 'single') {
        await deleteSingleTeacherAPI(teacherIdOrIds);
        success('Teacher deleted successfully');
      } else {
        await deleteMultipleTeachersAPI(teacherIdOrIds);
        success(`${teacherIdOrIds.length} teachers deleted successfully`);
      }
      
      // Refresh data
      await refreshTeachers();
      setRefreshTrigger(prev => prev + 1);
      
      console.log('✅ Delete successful, all data refreshed');
      
    } catch (err) {
      console.error('❌ Delete error:', err);
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setTeacherToDelete(null);
      
      if (deleteModalMode === 'bulk') {
        requestAnimationFrame(() => {
          setSelectedTeachers([]);
        });
      }
    }
  };

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faChalkboardUser} />} label="Teachers"></PageLabel>
      <SectionLabel label="Teacher Records"></SectionLabel>
      
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <Input 
            placeholder="Search by name, employee ID, email, phone..." 
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {selectedTeachers.length > 0 && (
            <Button
              color="danger"
              height="sm"
              width="md"
              label={`Delete Selected (${selectedTeachers.length})`}
              onClick={handleBulkDeleteClick}
            />
          )}
        </div>
        <Button 
          color="success" 
          height="sm" 
          width="md" 
          label="Add Teachers" 
          onClick={() => setIsOpen(true)}
        />
      </div>
      
      <FileUploadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityType="teacher"
        onUploadSuccess={handleUploadSuccess}
      />
      
      <TeacherTable 
        key={`teacher-table-${refreshTrigger}`}
        searchTerm={searchTerm}
        onSelectedTeachersUpdate={handleSelectedTeachersUpdate}
        onTeacherDataUpdate={handleTeacherDataUpdate}
        onSingleDeleteClick={handleSingleDeleteClick}
        refreshTeachers={refreshTeachers}
      />
      
      <DeleteTeacherModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setTeacherToDelete(null);
          }
        }}
        teacher={deleteModalMode === 'single' ? teacherToDelete : null}
        selectedTeachers={deleteModalMode === 'bulk' ? selectedTeachers : []}
        teacherData={teachers}
        onConfirm={deleteModalMode === 'single' ? handleConfirmDelete : undefined}
        onConfirmBulk={deleteModalMode === 'bulk' ? handleConfirmDelete : undefined}
        currentFilter={searchTerm}
      />
    </main>
  );
}

export default AdminTeachers;