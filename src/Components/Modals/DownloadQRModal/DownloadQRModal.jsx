import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal.jsx';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { formatStudentName, formatGradeSection } from '../../../Utils/Formatters.js'; 
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx'; 
import styles from './DownloadQRModal.module.css';
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import StudentList from '../../List/StudentList/StudentList.jsx';
import TitleModalLabel from '../../UI/Labels/TitleModalLabel/TitleModalLabel.jsx';
import MessageModalLabel from '../../UI/Labels/MessageModalLabel/MessageModalLabel.jsx';

function DownloadQRModal({
  isOpen,
  onClose,
  selectedStudents = [],
  studentData = [],
  currentFilter = '',
  currentSection = '',
  currentGrade = ''
}) {
  const { success, error } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const selectedCount = selectedStudents.length;
  
  // Get actual student objects from IDs
  const selectedStudentObjects = React.useMemo(() => 
    selectedStudents
      .map(studentId => studentData.find(s => s.id === studentId))
      .filter(student => student !== undefined),
    [selectedStudents, studentData]
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  const getContextDescription = () => {
    if (currentSection) {
      return `from Section ${currentSection}`;
    }
    if (currentFilter) {
      return `matching "${currentFilter}"`;
    }
    return `from Grade ${currentGrade}`;
  };

  // Function to download QR codes as ZIP
  const handleDownloadZIP = async () => {
    setIsProcessing(true);
    
    try {
      // Dynamically import JSZip - FIXED: JSZip is default export
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      
      // Create a folder for the QR codes
      const folderName = `QR_Codes_${currentGrade}_${currentSection || 'All'}_${new Date().toISOString().split('T')[0]}`;
      const qrFolder = zip.folder(folderName);
      
      // Generate QR code for each student
      for (const student of selectedStudentObjects) {
        // Generate QR code data
        const qrData = JSON.stringify({
          lrn: student.lrn,
          token: student.qr_verification_token,
          name: `${student.first_name} ${student.last_name}`,
          grade: student.grade,
          section: student.section,
          type: 'student_attendance'
        });
        
        // Create a simple canvas with QR code information
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        
        // Draw QR code placeholder (in real app, generate actual QR code)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', 100, 80);
        
        ctx.font = '12px Arial';
        ctx.fillText(student.lrn, 100, 110);
        ctx.fillText(`${student.first_name} ${student.last_name}`, 100, 130);
        ctx.fillText(`${student.grade}-${student.section}`, 100, 150);
        
        // Convert to PNG
        const pngData = canvas.toDataURL('image/png');
        
        // Convert base64 to blob
        const base64Data = pngData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Add file to ZIP
        const fileName = `QR_${student.lrn}_${student.first_name}_${student.last_name}.png`;
        qrFolder.file(fileName, byteArray);
      }
      
      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `${folderName}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      success(`Downloaded ${selectedCount} QR codes as ZIP file`);
      onClose();
      
    } catch (err) {
      console.error('Error creating ZIP:', err);
      error('Failed to create ZIP file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle individual download of QR codes
  const handleDownloadIndividual = async () => {
    setIsProcessing(true);
    
    try {
      for (const student of selectedStudentObjects) {
        // Generate QR code data
        const qrData = JSON.stringify({
          lrn: student.lrn,
          token: student.qr_verification_token,
          name: `${student.first_name} ${student.last_name}`,
          grade: student.grade,
          section: student.section,
          type: 'student_attendance'
        });
        
        // Create a simple canvas with QR code information
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        
        // Draw QR code placeholder
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', 100, 80);
        
        ctx.font = '12px Arial';
        ctx.fillText(student.lrn, 100, 110);
        ctx.fillText(`${student.first_name} ${student.last_name}`, 100, 130);
        ctx.fillText(`${student.grade}-${student.section}`, 100, 150);
        
        // Convert to PNG and download
        const pngData = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngData;
        downloadLink.download = `QR_${student.lrn}_${student.first_name}_${student.last_name}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      success(`Downloaded ${selectedCount} QR codes`);
      onClose();
      
    } catch (err) {
      console.error('Error downloading QR codes:', err);
      error('Failed to download QR codes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal size="md" isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContainer}>
        <TitleModalLabel>
          Download QR Codes for {selectedCount} Student{selectedCount !== 1 ? 's' : ''}
        </TitleModalLabel>
        
        <MessageModalLabel>
          {selectedCount} student{selectedCount !== 1 ? 's' : ''} {getContextDescription()}
        </MessageModalLabel>
        
        {/* Student List */}
        <StudentList 
          variant='multiple'
          students={selectedStudentObjects}
          title="Students to download"
        />
        
        {/* Note */}
        <InfoBox type="note">
          <strong>Note:</strong> This will download QR codes for all {selectedCount} selected student{selectedCount !== 1 ? 's' : ''}. QR Codes can be downloaded as Zip File or as Individual Files.
        </InfoBox>
        
        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <Button
            label={isProcessing ? 'Processing...' : 'ZIP'}
            color="primary"
            onClick={handleDownloadZIP}
            disabled={isProcessing}
            width="xs"
            height="sm"
          />
          <Button
            label={isProcessing ? 'Processing...' : 'Individual'}
            color="success"
            onClick={handleDownloadIndividual}
            disabled={isProcessing}
            width="sm"
            height="sm"
          />
          <Button
            label="Cancel"
            color="ghost"
            onClick={onClose}
            width="xs"
            height="sm"
          />
        </div>
      </div>
    </Modal>
  );
}

export default DownloadQRModal;