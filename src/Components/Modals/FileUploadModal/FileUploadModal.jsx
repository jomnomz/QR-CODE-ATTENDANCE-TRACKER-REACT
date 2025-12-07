import { useState, useRef, useEffect } from 'react'
import axios from "axios";
import Modal from '../Modal/Modal.jsx'
import styles from './FileUploadModal.module.css'
import Button from '../../UI/Buttons/Button/Button.jsx';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function FileUploadModal({ 
  isOpen, 
  onClose, 
  entityType = 'student', // 'student' or 'teacher'
  onUploadSuccess 
}) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadEndpoint, setUploadEndpoint] = useState('');
    const fileInputRef = useRef(null);
    const { success, error, warning, info } = useToast();

    // Set upload endpoint based on entity type
    useEffect(() => {
        if (entityType === 'teacher') {
            setUploadEndpoint('http://localhost:5000/api/teachers/upload');
        } else {
            setUploadEndpoint('http://localhost:5000/api/students/upload');
        }
    }, [entityType]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleFileSelection(droppedFiles[0]);
        }
    };

    const handleFileInputChange = (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    };

    const handleFileSelection = (selectedFile) => {
        const validFileExtensions = ['xlsx', 'xls', 'csv'];
        const extname = selectedFile.name.split('.').pop().toLowerCase();
        
        if (!validFileExtensions.includes(extname)) {
            warning('Please upload a valid Excel file (.xlsx, .xls, .csv)');
            return;
        }

        setFile(selectedFile);
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const resetFileUpload = () => {
        setFile(null);
        setIsDragOver(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Get modal title based on entity type
    const getModalTitle = () => {
        switch(entityType) {
            case 'teacher':
                return 'Upload Teacher Data';
            case 'student':
            default:
                return 'Upload Student Data';
        }
    };

    // Get description based on entity type
    const getDescription = () => {
        switch(entityType) {
            case 'teacher':
                return 'Upload an Excel or CSV file with teacher information. Required fields: Employee ID, First Name, Last Name.';
            case 'student':
            default:
                return 'Upload an Excel or CSV file with student information. Required fields: LRN, First Name, Last Name, Grade, Section.';
        }
    };

    // Get success message based on entity type
    const getSuccessMessage = (responseData) => {
  // Just use the message from the server
  return responseData.message || 'Upload completed successfully';
};

    // Get field mapping download link
    const getFieldMappingLink = () => {
        switch(entityType) {
            case 'teacher':
                return '/templates/teacher-import-template.xlsx';
            case 'student':
            default:
                return '/templates/student-import-template.xlsx';
        }
    };

    async function handleUpload() {
  if (!file) {
    warning('Please select a file first'); 
    return;
  }

  setIsUploading(true);

  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log(`🚀 Starting ${entityType} upload...`);
    
    const endpoint = entityType === 'teacher' 
      ? 'http://localhost:5000/api/teachers/upload'
      : 'http://localhost:5000/api/students/upload';
    
    const response = await axios.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log('✅ Upload response:', response.data);
            
    if (response.data.success) {
      // Check if any new records were added
      if (response.data.hasNewRecords === false || response.data.summary?.newRecordsCreated === 0) {
        warning(response.data.message); // Show warning toast
      } else {
        success(response.data.message); // Show success toast
      }
      
      // Call the callback to refresh entities (only if new records were added)
      if (onUploadSuccess && response.data.summary?.newRecordsCreated > 0) {
        const newEntities = response.data[entityType === 'teacher' ? 'newTeachers' : 'newStudents'] || [];
        onUploadSuccess(newEntities);
      }
      
      onClose();  
      resetFileUpload();
    } else {
      error(response.data.error || 'Upload failed');
    }

  } catch (err) {
    console.error('❌ Upload failed:', err);
    
    if (err.response?.data?.error) {
      error(err.response.data.error);
    } else {
      error(`Upload failed. Please check the file format and try again.`);
    }
  } finally {
    setIsUploading(false);
  }
}

    const handleClose = () => {
        resetFileUpload();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="md"> 
            <div className={styles.modalContainer}>
                <h2>{getModalTitle()}</h2>
                <MessageModalLabel>
                    <p>{getDescription()}</p>
                    <p className={styles.note}>
                        <strong>Note:</strong> All records must be valid. If any record has errors, the entire upload will be rejected.
                    </p>
                    <p className={styles.templateLink}>
                        <a 
                            href={getFieldMappingLink()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Download field mapping template
                        </a>
                    </p>
                </MessageModalLabel>
                
                <div 
                    className={`${styles.dropArea} ${isDragOver ? styles.highlight : ''} ${file ? styles.hasFile : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <InsertDriveFileIcon sx={{ fontSize: 90 }} className={styles.icon} /> 
                    <p>Drag and drop your file here</p>
                    <Button
                        label="Select Files" 
                        height="xs"
                        width="sm"
                        pill={true}
                        color="primary"
                        className={styles.browseBtn}
                        onClick={handleBrowseClick}
                    />
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".xlsx, .xls, .csv"
                        className={styles.fileInput}
                    />
                </div>
                
                {file && (
                    <div className={styles.fileInfo}>
                        <p>Selected file: <strong>{file.name}</strong> ({formatFileSize(file.size)})</p>
                    </div>
                )}
                
                <Button 
                    className={styles.submitBtn}
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    label={isUploading ? 'Uploading...' : 'Submit'}
                />
            </div>
        </Modal>
    )
}

export default FileUploadModal;