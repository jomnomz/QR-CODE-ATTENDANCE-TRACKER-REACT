import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal.jsx';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { useToast } from '../../Toast/ToastContext/ToastContext.jsx'; 
import styles from './DownloadQRModal.module.css';
import InfoBox from '../../UI/InfoBoxes/InfoBox/InfoBox.jsx';
import EntityList from '../../List/EntityList/EntityList.jsx';
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
  
  const selectedStudentObjects = React.useMemo(() => 
    selectedStudents
      .map(studentId => studentData.find(s => s.id === studentId))
      .filter(student => student !== undefined),
    [selectedStudents, studentData]
  );

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

  const handleDownloadZIP = async () => {
    setIsProcessing(true);
    
    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      
      const folderName = `QR_Codes_${currentGrade}_${currentSection || 'All'}_${new Date().toISOString().split('T')[0]}`;
      const qrFolder = zip.folder(folderName);
      
      for (const student of selectedStudentObjects) {
        const qrData = JSON.stringify({
          lrn: student.lrn,
          token: student.qr_verification_token,
          name: `${student.first_name} ${student.last_name}`,
          grade: student.grade,
          section: student.section,
          type: 'student_attendance'
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', 100, 80);
        
        ctx.font = '12px Arial';
        ctx.fillText(student.lrn, 100, 110);
        ctx.fillText(`${student.first_name} ${student.last_name}`, 100, 130);
        ctx.fillText(`${student.grade}-${student.section}`, 100, 150);
        
        const pngData = canvas.toDataURL('image/png');
        const base64Data = pngData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        const fileName = `QR_${student.lrn}_${student.first_name}_${student.last_name}.png`;
        qrFolder.file(fileName, byteArray);
      }
      
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

  const handleDownloadIndividual = async () => {
    setIsProcessing(true);
    
    try {
      for (const student of selectedStudentObjects) {
        const qrData = JSON.stringify({
          lrn: student.lrn,
          token: student.qr_verification_token,
          name: `${student.first_name} ${student.last_name}`,
          grade: student.grade,
          section: student.section,
          type: 'student_attendance'
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', 100, 80);
        
        ctx.font = '12px Arial';
        ctx.fillText(student.lrn, 100, 110);
        ctx.fillText(`${student.first_name} ${student.last_name}`, 100, 130);
        ctx.fillText(`${student.grade}-${student.section}`, 100, 150);
        
        const pngData = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngData;
        downloadLink.download = `QR_${student.lrn}_${student.first_name}_${student.last_name}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
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
        
        <EntityList 
          entities={selectedStudentObjects}
          variant="multiple"
          title="Students to download"
          entityType="student"
        />
        
        <InfoBox type="note">
          <strong>Note:</strong> This will download QR codes for all {selectedCount} selected student{selectedCount !== 1 ? 's' : ''}. QR Codes can be downloaded as Zip File or as Individual Files.
        </InfoBox>
        
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