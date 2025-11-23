import { useState, useRef } from 'react'
import axios from "axios";
import Modal from '../Modal/Modal.jsx'
import styles from './FileUploadModal.module.css'
import Button from '../../UI/Buttons/Button/Button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFile } from "@fortawesome/free-solid-svg-icons";

function FileUploadModal({ isOpen, onClose }) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

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

    async function handleUpload(){
        if (!file){
            alert('Please select a file first');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                'http://localhost:5000/api/students/upload', 
                formData, 
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            console.log('Upload successful:', response.data);
            alert(`Success! ${response.data.message}`);
            onClose();  
            resetFileUpload();

        } catch (error) {
            console.error('Upload failed:', error);
            
            if (error.response) {
                alert(`Upload failed: ${error.response.data.error || 'Server error'}`);
            } else if (error.request) {
                alert('Upload failed: Cannot connect to server. Make sure your backend is running on port 5000.');
            } else {
                alert(`Upload failed: ${error.message}`);
            }
        } finally {
            setIsUploading(false);
        }
    }

    const handleClose = () => {
        resetFileUpload();
        onClose();
    };

    return(
    <Modal isOpen={isOpen} onClose={handleClose} size="sm"> 
        <div className={styles.modalContainer}>
            <h2>Upload Student Data</h2>
            <p>Please upload an Excel or CSV file with student information</p>
            
            <div 
                className={`${styles.dropArea} ${isDragOver ? styles.highlight : ''} ${file ? styles.hasFile : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <FontAwesomeIcon icon={faFile} className={styles.icon} />
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