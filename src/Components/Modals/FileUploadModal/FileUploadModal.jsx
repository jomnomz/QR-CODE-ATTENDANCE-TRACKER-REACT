import { useState } from 'react'
import axios from "axios";
import Modal from '../Modal/Modal.jsx'
import styles from './FileUploadModal.module.css'

function FileUploadModal({isOpen, onClose} ){

    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    async function handleUpload(){
        if (!file){
            alert('Please select a file first');
            return;
        }

        const validFileExtensions = ['xlsx', 'xls', 'csv'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (!validFileExtensions.includes(fileExtension)) {
            alert('Please upload a valid Excel file (.xlsx, .xls, .csv)');
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
            setFile(null); 

        } catch (error) {
            console.error('Upload failed:', error);
            
            if (error.response) {
                // Server responded with error status
                alert(`Upload failed: ${error.response.data.error || 'Server error'}`);
            } else if (error.request) {
                // Request made but no response received
                alert('Upload failed: Cannot connect to server. Make sure your backend is running on port 5000.');
            } else {
                // Something else happened
                alert(`Upload failed: ${error.message}`);
            }
        } finally {
            setIsUploading(false);
        }
    }

    return(
    <Modal isOpen={isOpen} onClose={onClose} size="sm"> 
        <div className={styles.modalContainer}>
            <h2>Upload Student Data</h2>
            <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])} 
                accept=".xlsx, .xls, .csv"
            />
            <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
            >
                {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            
            {file && (
                <div className={styles.fileInfo}>
                    <p>Selected file: {file.name}</p>
                </div>
            )}
        </div>
    </Modal>
    )
}

export default FileUploadModal