import { useState, useCallback, useEffect } from 'react' 
import styles from './AdminStudents.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import FileUploadModal from "../../../Components/Modals/FileUploadModal/FileUploadModal.jsx";
import Button from "../../../Components/UI/Buttons/Button/Button.jsx";
import StudentTable from '../../../Components/Tables/StudentTable/StudentTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import DropDownButton from '../../../Components/UI/Buttons/DropDownButton/DropDownButton.jsx';
import ActionsDropdownButton from '../../../Components/UI/Buttons/ActionsDropDownButton/ActionsDropDownButton.jsx';
import DeleteStudentModal from '../../../Components/Modals/DeleteStudentModal/DeleteStudentModal.jsx';
import PromoteModal from '../../../Components/Modals/PromoteModal/PromoteModal.jsx';
import MoveSectionModal from '../../../Components/Modals/MoveSectionModal.jsx/MoveSectionModal.jsx';
import DownloadQRModal from '../../../Components/Modals/DownloadQRModal/DownloadQRModal.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faUsers} from "@fortawesome/free-solid-svg-icons";
import { useToast } from '../../../Components/Toast/ToastContext/ToastContext.jsx';
import { StudentService } from '../../../Utils/EntityService.js';

function AdminStudents() {
  const { success, error: toastError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('7');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState('single');
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Create an instance of StudentService
  const studentService = new StudentService();

  // Fetch ALL students from all grades
  const fetchAllStudents = useCallback(async () => {
    try {
      console.log('🔄 Fetching ALL students from all grades...');
      // Use fetchAll() method from the instantiated service
      const allStudentsData = await studentService.fetchAll();
      setAllStudents(allStudentsData);
      console.log('✅ All students loaded:', allStudentsData.length);
    } catch (err) {
      console.error('❌ Error loading all students:', err);
      toastError('Failed to load student data');
    }
  }, [toastError]);

  useEffect(() => {
    fetchAllStudents();
  }, [fetchAllStudents]);

  const refreshStudents = useCallback(() => {
    console.log('🔄 Refreshing student data...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle file upload success
  const handleUploadSuccess = useCallback((newStudents) => {
    console.log('🆕 Students uploaded, refreshing all data...', newStudents);
    fetchAllStudents();
    setRefreshTrigger(prev => prev + 1);
  }, [fetchAllStudents]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
  };

  const handleClearSectionFilter = () => {
    setSelectedSection('');
  };

  const handleSectionsUpdate = (sections) => {
    setAvailableSections(sections);
  };

  const handleSelectedStudentsUpdate = (selected) => {
    setSelectedStudents(selected);
  };

  const handleStudentDataUpdate = (studentData) => {
    console.log('Current grade students updated:', studentData.length);
  };

  const handleGradeUpdate = (grade) => {
    setCurrentGrade(grade);
  };

  const handleDeleteSelected = (count, description) => {
    setDeleteModalMode('bulk');
    setIsDeleteModalOpen(true);
  };

  const handlePromoteSelected = (count, description) => {
    if (count > 0) {
      setIsPromoteModalOpen(true);
    }
  };

  const handleMoveSelected = (count, description) => {
    if (count > 0) {
      setIsMoveModalOpen(true);
    }
  };

  const handleDownloadQR = (count, description) => {
    if (count > 0) {
      setIsQRModalOpen(true);
    }
  };

  const handleSingleDeleteClick = (student) => {
    setDeleteModalMode('single');
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const deleteSingleStudentAPI = async (studentId) => {
    try {
      console.log('🔄 Deleting student ID:', studentId);
      await studentService.delete(studentId);
      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting student:', err);
      throw new Error(`Failed to delete student: ${err.message}`);
    }
  };

  const deleteMultipleStudentsAPI = async (studentIds) => {
    try {
      console.log('🔄 Deleting multiple students:', studentIds);
      
      for (const studentId of studentIds) {
        await studentService.delete(studentId);
      }
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error bulk deleting students:', err);
      throw new Error(`Failed to delete students: ${err.message}`);
    }
  };

  const handleConfirmDelete = async (studentIdOrIds) => {
    console.log('DELETE FUNCTION CALLED! Mode:', deleteModalMode, 'IDs:', studentIdOrIds);
    setIsDeleting(true);
    
    try {
      if (deleteModalMode === 'single') {
        await deleteSingleStudentAPI(studentIdOrIds);
        success('Student deleted successfully');
      } else {
        await deleteMultipleStudentsAPI(studentIdOrIds);
        success(`${studentIdOrIds.length} students deleted successfully`);
      }
      
      // Refresh data first
      await fetchAllStudents();
      setRefreshTrigger(prev => prev + 1);
      
      console.log('✅ Delete successful, all data refreshed');
      
    } catch (err) {
      console.error('❌ Delete error:', err);
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      
      // Clear selected students in the next tick after modal closes
      if (deleteModalMode === 'bulk') {
        requestAnimationFrame(() => {
          setSelectedStudents([]);
        });
      }
    }
  };

  // Promote students API function
  const promoteStudentsAPI = async (studentIds, nextGrade, targetSection) => {
    try {
      console.log('🔄 Promoting students:', studentIds, 'to grade', nextGrade, 'section', targetSection);
      
      const updatePromises = studentIds.map(studentId => 
        studentService.update(studentId, { 
          grade: nextGrade, 
          section: targetSection 
        })
      );
      
      await Promise.all(updatePromises);
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error promoting students:', err);
      throw new Error(`Failed to promote students: ${err.message}`);
    }
  };

  // Move students API function
  const moveStudentsAPI = async (studentIds, targetSection) => {
    try {
      console.log('🔄 Moving students:', studentIds, 'to section', targetSection);
      
      const updatePromises = studentIds.map(studentId => 
        studentService.update(studentId, { 
          section: targetSection 
        })
      );
      
      await Promise.all(updatePromises);
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error moving students:', err);
      throw new Error(`Failed to move students: ${err.message}`);
    }
  };

  // Handle promote confirmation
  const handleConfirmPromote = async (studentIds, nextGrade, targetSection) => {
    try {
      await promoteStudentsAPI(studentIds, nextGrade, targetSection);
      success(`${studentIds.length} students promoted to Grade ${nextGrade}, Section ${targetSection}`);
      
      await fetchAllStudents();
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      toastError(`Failed to promote: ${err.message}`);
    }
  };

  // Handle move confirmation
  const handleConfirmMove = async (studentIds, targetSection) => {
    try {
      await moveStudentsAPI(studentIds, targetSection);
      success(`${studentIds.length} students moved to Section ${targetSection}`);
      
      await fetchAllStudents();
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      toastError(`Failed to move students: ${err.message}`);
    }
  };

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faUsers} />} label="Students"></PageLabel>
      <SectionLabel label="Student Records"></SectionLabel>
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <Input 
            placeholder="Search by name, LRN, email, phone..." 
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <DropDownButton 
            options={availableSections}
            placeholder="Filter by section"
            selectedValue={selectedSection}
            onSelect={handleSectionSelect}
          />
          <ActionsDropdownButton 
            selectedCount={selectedStudents.length}
            currentFilter={searchTerm}
            currentSection={selectedSection}
            currentGrade={currentGrade}
            onDeleteSelected={handleDeleteSelected}
            onPromoteSelected={handlePromoteSelected}
            onMoveSelected={handleMoveSelected}
            onDownloadQR={handleDownloadQR}
          />
        </div>
        <Button color="success" height="sm" width="xs" label="Create" onClick={() => {setIsOpen(true);}}></Button>
      </div>
      
      <FileUploadModal 
        isOpen={isOpen} 
        type="student" 
        onClose={() => setIsOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
      
        <StudentTable 
          key={`student-table-${refreshTrigger}`}
          searchTerm={searchTerm} 
          selectedSection={selectedSection}
          onSectionsUpdate={handleSectionsUpdate}
          onSelectedStudentsUpdate={handleSelectedStudentsUpdate}
          onStudentDataUpdate={handleStudentDataUpdate}
          onGradeUpdate={handleGradeUpdate}
          onClearSectionFilter={handleClearSectionFilter}
          onSingleDeleteClick={handleSingleDeleteClick}
          refreshStudents={refreshStudents}
          refreshAllStudents={fetchAllStudents}
        />
      
      <DeleteStudentModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setStudentToDelete(null);
          }
        }}
        student={deleteModalMode === 'single' ? studentToDelete : null}
        selectedStudents={deleteModalMode === 'bulk' ? selectedStudents : []}
        studentData={allStudents}
        onConfirm={deleteModalMode === 'single' ? handleConfirmDelete : undefined}
        onConfirmBulk={deleteModalMode === 'bulk' ? handleConfirmDelete : undefined}
        currentFilter={searchTerm}
        currentSection={selectedSection}
        currentGrade={currentGrade}
      />

      <PromoteModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        selectedStudents={selectedStudents}
        studentData={allStudents}
        onConfirm={handleConfirmPromote}
        currentGrade={currentGrade}
        allStudents={allStudents}
      />

      <MoveSectionModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        selectedStudents={selectedStudents}
        studentData={allStudents}
        onConfirm={handleConfirmMove}
        currentGrade={currentGrade}
        allStudents={allStudents}
      />

      <DownloadQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        selectedStudents={selectedStudents}
        studentData={allStudents}
        currentFilter={searchTerm}
        currentSection={selectedSection}
        currentGrade={currentGrade}
      />
    </main>
  );
}

export default AdminStudents;