import { useState, useRef } from 'react'
import axios from "axios";
import Modal from '../Modal/Modal.jsx'
import styles from './FileUploadModal.module.css'
import Button from '../../UI/Buttons/Button/Button.jsx';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function FileUploadModal({ isOpen, onClose, addStudent, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const { success, error, warning, info } = useToast();

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
            alert('Please upload a valid Excel file (.xlsx, .xls, .csv)');
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

    async function handleUpload() {
        if (!file) {
            warning('Please select a file first'); 
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('🚀 Starting upload...');
            const response = await axios.post(
                'http://localhost:5000/api/students/upload', 
                formData, 
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            console.log('✅ Upload successful:', response.data);
            console.log('🆕 Students created:', response.data.newStudents);
            
            // Check if any new students were added
            const newStudentsCount = response.data.newStudents?.length || 0;
            
            if (newStudentsCount === 0) {
                // Show warning if no students were added
                warning('No new students were added. All students in the file already exist in the system.');
            } else {
                // Show success if students were added
                success(`Successfully added ${newStudentsCount} student${newStudentsCount !== 1 ? 's' : ''}!`);
            }
            
            // NEW: Call the callback to refresh all students (even if 0 were added)
            if (onUploadSuccess) {
                onUploadSuccess(response.data.newStudents || []);
            }
            
            onClose();  
            resetFileUpload();

        } catch (err) {
            console.error('❌ Upload failed:', err);
            error('Upload failed. Please check the file format and try again.');
        } finally {
            setIsUploading(false);
        }
    }

    const handleClose = () => {
        resetFileUpload();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm"> 
            <div className={styles.modalContainer}>
                <h2>Upload Student Data</h2>
                <MessageModalLabel>
                    <p>Upload an Excel or CSV file with student information</p>
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