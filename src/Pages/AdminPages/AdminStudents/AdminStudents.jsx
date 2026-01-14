import { useState, useCallback, useEffect } from 'react' 
import styles from './AdminStudents.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import FileUploadModal from "../../../Components/Modals/FileUploadModal/FileUploadModal.jsx";
import Button from "../../../Components/UI/Buttons/Button/Button.jsx";
import StudentTable from '../../../Components/Tables/StudentTable/StudentTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import DeleteEntityModal from '../../../Components/Modals/DeleteEntityModal/DeleteEntityModal.jsx';
import DownloadQRModal from '../../../Components/Modals/DownloadQRModal/DownloadQRModal.jsx';
import SectionDropdown from '../../../Components/UI/Buttons/SectionDropdown/SectionDropdown.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faTrash, faQrcode } from "@fortawesome/free-solid-svg-icons";
import { useToast } from '../../../Components/Toast/ToastContext/ToastContext.jsx';
import { StudentService } from '../../../Utils/EntityService.js';
import { supabase } from '../../../lib/supabase'; // Add supabase import

function AdminStudents() {
  const { success, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('7');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState('single');
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  // Add these new states
  const [gradesData, setGradesData] = useState([]);
  const [sectionsData, setSectionsData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const studentService = new StudentService();

  // Fetch grades data
  const fetchGrades = useCallback(async () => {
    try {
      console.log('🔄 Fetching grades data...');
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .order('id');
      
      if (error) throw error;
      setGradesData(data || []);
      console.log('✅ Grades loaded:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error loading grades:', err);
      toastError('Failed to load grades data');
    }
  }, [toastError]);

  // Fetch sections data
  const fetchSections = useCallback(async () => {
    try {
      console.log('🔄 Fetching sections data...');
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          grade:grades(grade_level)
        `)
        .order('id');
      
      if (error) throw error;
      setSectionsData(data || []);
      console.log('✅ Sections loaded:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error loading sections:', err);
      toastError('Failed to load sections data');
    }
  }, [toastError]);

  const fetchAllStudents = useCallback(async () => {
    try {
      console.log('🔄 Fetching ALL students from all grades...');
      const allStudentsData = await studentService.fetchAll();
      
      // Transform student data to include proper grade and section names
      const transformedStudents = allStudentsData.map(student => {
        // Find grade name from gradesData using grade_id
        const grade = gradesData.find(g => g.id === student.grade_id);
        // Find section name from sectionsData using section_id
        const section = sectionsData.find(s => s.id === student.section_id);
        
        return {
          ...student,
          // Use related table names if available, otherwise fall back to direct fields
          grade: grade ? grade.grade_level : student.grade || 'N/A',
          section: section ? section.section_name : student.section || 'N/A',
          // Keep original IDs
          grade_id: student.grade_id,
          section_id: student.section_id
        };
      });
      
      setAllStudents(transformedStudents);
      console.log('✅ All students loaded:', transformedStudents.length);
    } catch (err) {
      console.error('❌ Error loading all students:', err);
      toastError('Failed to load student data');
    }
  }, [toastError, gradesData, sectionsData]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingData(true);
      try {
        await Promise.all([
          fetchGrades(),
          fetchSections()
        ]);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchInitialData();
  }, [fetchGrades, fetchSections]);

  // Fetch students after grades and sections are loaded
  useEffect(() => {
    if (!loadingData && gradesData.length > 0) {
      fetchAllStudents();
    }
  }, [loadingData, fetchAllStudents]);

  const refreshStudents = useCallback(() => {
    console.log('🔄 Refreshing student data...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

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

  const handleBulkDeleteClick = () => {
    if (selectedStudents.length > 0) {
      setDeleteModalMode('bulk');
      setIsDeleteModalOpen(true);
    }
  };

  const handleBulkQRClick = () => {
    if (selectedStudents.length > 0) {
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
      
      if (deleteModalMode === 'bulk') {
        requestAnimationFrame(() => {
          setSelectedStudents([]);
        });
      }
    }
  };

  return (
    <main className={styles.main}>
      <PageLabel icon={<FontAwesomeIcon icon={faUsers} />} label="Students"></PageLabel>
      <SectionLabel label="Student Records"></SectionLabel>
      
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <Input 
            placeholder="Search Student Records" 
            value={searchTerm}
            onChange={handleSearchChange}
            search="true"
          />
          
          {selectedStudents.length > 0 && (
            <div className={styles.bulkActions}>
              <Button
                color="primary"
                height="sm"
                width="auto"
                icon={<FontAwesomeIcon icon={faQrcode} />}
                onClick={handleBulkQRClick}
                style={{ marginRight: '10px' }}
                disabled={loadingData}
              />
              <Button
                color="danger"
                height="sm"
                width="auto"
                icon={<FontAwesomeIcon icon={faTrash} />}
                onClick={handleBulkDeleteClick}
                disabled={isDeleting || loadingData}
              />
            </div>
          )}
        </div>
        
        <div className={styles.addButtons}>
          <Button 
            color="success" 
            height="sm" 
            width="md" 
            label="Add Students" 
            onClick={() => setIsUploadModalOpen(true)}
            style={{ marginRight: '10px' }}
            disabled={loadingData}
          />
        </div>
      </div>
      
      {loadingData ? (
        <div className={styles.loadingContainer}>
          <p>Loading student data...</p>
        </div>
      ) : (
        <>
          <FileUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            entityType="student"
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
            onSectionSelect={handleSectionSelect}
            availableSections={availableSections}
            gradesData={gradesData} // Pass grades data to StudentTable if needed
            sectionsData={sectionsData} // Pass sections data to StudentTable if needed
          />
        </>
      )}
      
      <DeleteEntityModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setStudentToDelete(null);
          }
        }}
        entity={deleteModalMode === 'single' ? studentToDelete : null}
        selectedEntities={deleteModalMode === 'bulk' ? selectedStudents : []}
        entityData={allStudents}
        entityType="student"
        onConfirm={deleteModalMode === 'single' ? handleConfirmDelete : undefined}
        onConfirmBulk={deleteModalMode === 'bulk' ? handleConfirmDelete : undefined}
        currentFilter={searchTerm}
        currentSection={selectedSection}
        currentGrade={currentGrade}
      />

      <DownloadQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        selectedStudents={selectedStudents}
        studentData={allStudents}
        currentFilter={searchTerm}
        currentSection={selectedSection}
        currentGrade={currentGrade}
        gradesData={gradesData} // Pass grades data
        sectionsData={sectionsData} // Pass sections data
      />
    </main>
  );
}

export default AdminStudents;