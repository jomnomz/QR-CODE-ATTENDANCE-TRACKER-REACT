import { useState, useCallback, useEffect } from 'react';
import styles from './AdminMasterData.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import FileUploadModal from '../../../Components/Modals/FileUploadModal/FileUploadModal.jsx';
import Button from '../../../Components/UI/Buttons/Button/Button.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import DeleteEntityModal from '../../../Components/Modals/DeleteEntityModal/DeleteEntityModal.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import TableChartIcon from '@mui/icons-material/TableChart';
import GradeSectionTable from '../../../Components/Tables/GradeSectionTable/GradeSectionTable.jsx';
import SubjectTable from '../../../Components/Tables/SubjectTable/SubjectTable.jsx';
import GradeSchedulesTable from '../../../Components/Tables/GradeSchedulesTable/GradeSchedulesTable.jsx';
import { useToast } from '../../../Components/Toast/ToastContext/ToastContext.jsx';
import { EntityService } from '../../../Utils/EntityService.js';

function AdminMasterData() {
  const { success, error: toastError } = useToast();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('gradeSections');
  
  const [gradeSectionSearch, setGradeSectionSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  
  const [selectedGradeSections, setSelectedGradeSections] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState('single');
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteEntityType, setDeleteEntityType] = useState('');

  const sectionService = new EntityService('sections');
  const subjectService = new EntityService('subjects');
  const scheduleService = new EntityService('grade_schedules');

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleUploadSuccess = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setSelectedGradeSections([]);
    setSelectedSubjects([]);
    setSelectedSchedules([]);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (activeTab === 'gradeSections') {
      setGradeSectionSearch(value);
    } else if (activeTab === 'subjects') {
      setSubjectSearch(value);
    } else if (activeTab === 'schedules') {
      setScheduleSearch(value);
    }
  };

  const handleGradeSectionsSelectedUpdate = (selected) => {
    setSelectedGradeSections(selected);
  };

  const handleSubjectsSelectedUpdate = (selected) => {
    setSelectedSubjects(selected);
  };

  const handleSchedulesSelectedUpdate = (selected) => {
    setSelectedSchedules(selected);
  };

  const handleBulkDeleteClick = () => {
    setDeleteEntityType(activeTab);
    setDeleteModalMode('bulk');
    setIsDeleteModalOpen(true);
  };

  const handleSingleDeleteClick = (entity, entityType) => {
    setDeleteEntityType(entityType);
    setDeleteModalMode('single');
    setEntityToDelete(entity);
    setIsDeleteModalOpen(true);
  };

  const deleteSingleGradeSectionAPI = async (id) => {
    try {
      await sectionService.delete(id);
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete grade section: ${err.message}`);
    }
  };

  const deleteMultipleGradeSectionsAPI = async (ids) => {
    try {
      for (const id of ids) {
        await sectionService.delete(id);
      }
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete grade sections: ${err.message}`);
    }
  };

  const deleteSingleSubjectAPI = async (id) => {
    try {
      await subjectService.delete(id);
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete subject: ${err.message}`);
    }
  };

  const deleteMultipleSubjectsAPI = async (ids) => {
    try {
      for (const id of ids) {
        await subjectService.delete(id);
      }
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete subjects: ${err.message}`);
    }
  };

  const deleteSingleScheduleAPI = async (id) => {
    try {
      await scheduleService.delete(id);
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete schedule: ${err.message}`);
    }
  };

  const deleteMultipleSchedulesAPI = async (ids) => {
    try {
      for (const id of ids) {
        await scheduleService.delete(id);
      }
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete schedules: ${err.message}`);
    }
  };

  const handleConfirmDelete = async (idOrIds) => {
    setIsDeleting(true);
    
    try {
      if (deleteModalMode === 'single') {
        if (deleteEntityType === 'gradeSections') {
          await deleteSingleGradeSectionAPI(idOrIds);
          success('Grade section deleted successfully');
        } else if (deleteEntityType === 'subjects') {
          await deleteSingleSubjectAPI(idOrIds);
          success('Subject deleted successfully');
        } else if (deleteEntityType === 'schedules') {
          await deleteSingleScheduleAPI(idOrIds);
          success('Grade schedule deleted successfully');
        }
      } else {
        if (deleteEntityType === 'gradeSections') {
          await deleteMultipleGradeSectionsAPI(idOrIds);
          success(`${idOrIds.length} grade sections deleted successfully`);
          setSelectedGradeSections([]);
        } else if (deleteEntityType === 'subjects') {
          await deleteMultipleSubjectsAPI(idOrIds);
          success(`${idOrIds.length} subjects deleted successfully`);
          setSelectedSubjects([]);
        } else if (deleteEntityType === 'schedules') {
          await deleteMultipleSchedulesAPI(idOrIds);
          success(`${idOrIds.length} grade schedules deleted successfully`);
          setSelectedSchedules([]);
        }
      }
      
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (err) {
      console.error('❌ Delete error:', err);
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setEntityToDelete(null);
      setDeleteEntityType('');
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'gradeSections':
        return "Search grades, sections, or rooms...";
      case 'subjects':
        return "Search subject codes or names...";
      case 'schedules':
        return "Search grade levels or times...";
      default:
        return "Search...";
    }
  };

  const getSelectedCount = () => {
    switch (activeTab) {
      case 'gradeSections':
        return selectedGradeSections.length;
      case 'subjects':
        return selectedSubjects.length;
      case 'schedules':
        return selectedSchedules.length;
      default:
        return 0;
    }
  };

  const getCurrentSearch = () => {
    switch (activeTab) {
      case 'gradeSections':
        return gradeSectionSearch;
      case 'subjects':
        return subjectSearch;
      case 'schedules':
        return scheduleSearch;
      default:
        return '';
    }
  };

  const getTableInfoMessage = () => {
    let count = 0;
    let type = '';
    
    switch (activeTab) {
      case 'gradeSections':
        count = selectedGradeSections.length;
        type = 'grade section';
        break;
      case 'subjects':
        count = selectedSubjects.length;
        type = 'subject';
        break;
      case 'schedules':
        count = selectedSchedules.length;
        type = 'grade schedule';
        break;
      default:
        return '';
    }
    
    if (count > 0) {
      return `${count} ${type}${count !== 1 ? 's' : ''} selected`;
    }
    return '';
  };

  return (
    <main className={styles.main}>
      <PageLabel 
        icon={<TableChartIcon sx={{ fontSize: 50, mb: -0.7 }} />}  
        label="Master Data"
      />
      
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <Input 
            placeholder={getSearchPlaceholder()} 
            value={getCurrentSearch()}
            onChange={handleSearchChange}
            search="true"
          />
          
          {getSelectedCount() > 0 && (
            <div className={styles.bulkActions}>
              <Button
                color="danger"
                height="sm"
                width="auto"
                icon={<FontAwesomeIcon icon={faTrash} />}
                onClick={handleBulkDeleteClick}
                disabled={isDeleting}
              />
            </div>
          )}
        </div>
        
        <div className={styles.addButtons}>
          <Button
            height="sm" 
            width="lg"
            label="Add Master Data"
            color="success"
            onClick={handleOpenUploadModal}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabContainer}>
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <Button
              label="Grade and Section"
              tabBottom={true}
              height="xs"
              width="md"
              color="grades"
              active={activeTab === 'gradeSections'}
              onClick={() => setActiveTab('gradeSections')}
            />
            <Button
              label="Subjects"
              tabBottom={true}
              height="xs"
              width="md"
              color="grades"
              active={activeTab === 'subjects'}
              onClick={() => setActiveTab('subjects')}
            />
            <Button
              label="Grade Schedules"
              tabBottom={true}
              height="xs"
              width="md"
              color="grades"
              active={activeTab === 'schedules'}
              onClick={() => setActiveTab('schedules')}
            />
          </div>
          
          <div className={styles.tableInfo}>
            <p>{getTableInfoMessage()}</p>
          </div>
        </div>
        
        {/* CHANGED: Removed .tableWrapper and use .tabContent instead */}
        <div className={styles.tabContent}>
          {activeTab === 'gradeSections' && (
            <GradeSectionTable 
              key={`grade-section-${refreshKey}`}
              searchTerm={gradeSectionSearch}
              onSelectedGradeSectionsUpdate={handleGradeSectionsSelectedUpdate}
              selectedGradeSections={selectedGradeSections}
              onSingleDeleteClick={handleSingleDeleteClick}
            />
          )}
          
          {activeTab === 'subjects' && (
            <SubjectTable 
              key={`subject-${refreshKey}`}
              searchTerm={subjectSearch}
              onSelectedSubjectsUpdate={handleSubjectsSelectedUpdate}
              selectedSubjects={selectedSubjects}
              onSingleDeleteClick={handleSingleDeleteClick}
            />
          )}
          
          {activeTab === 'schedules' && (
            <GradeSchedulesTable 
              key={`schedule-${refreshKey}`}
              searchTerm={scheduleSearch}
              onSelectedSchedulesUpdate={handleSchedulesSelectedUpdate}
              selectedSchedules={selectedSchedules}
              onSingleDeleteClick={handleSingleDeleteClick}
            />
          )}
        </div>
      </div>

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseUploadModal}
        entityType="master-data"
        onUploadSuccess={handleUploadSuccess}
      />
      
      <DeleteEntityModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setEntityToDelete(null);
            setDeleteEntityType('');
          }
        }}
        entity={deleteModalMode === 'single' ? entityToDelete : null}
        selectedEntities={deleteModalMode === 'bulk' ? 
          (deleteEntityType === 'gradeSections' ? selectedGradeSections : 
           deleteEntityType === 'subjects' ? selectedSubjects : 
           selectedSchedules) : []}
        entityType={deleteEntityType}
        onConfirm={deleteModalMode === 'single' ? handleConfirmDelete : undefined}
        onConfirmBulk={deleteModalMode === 'bulk' ? handleConfirmDelete : undefined}
        currentFilter={getCurrentSearch()}
      />
    </main>
  );
}

export default AdminMasterData;