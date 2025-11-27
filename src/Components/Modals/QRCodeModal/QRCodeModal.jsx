import Modal from "../Modal/Modal";
import Button from "../../UI/Buttons/Button/Button";
import styles from './QRCodeModal.module.css';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';

function QRCodeModal({ isOpen, onClose, student }) {
  const qrRef = useRef();

  if (!student) return null;

  const qrData = JSON.stringify({
    student_id: student.student_id,
    token: student.qr_verification_token,
    name: `${student.first_name} ${student.last_name}`
  });

  const handleDownloadQR = () => {
    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${student.student_id}_${student.first_name}_${student.last_name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${student.first_name} ${student.last_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
            }
            .student-info { 
              margin-bottom: 20px; 
            }
            .qr-code { 
              margin: 20px auto; 
            }
          </style>
        </head>
        <body>
          <div class="student-info">
            <h2>${student.first_name} ${student.last_name}</h2>
            <p>Student ID: ${student.student_id}</p>
            <p>Grade ${student.grade} - Section ${student.section}</p>
          </div>
          <div class="qr-code">
            ${new XMLSerializer().serializeToString(qrRef.current)}
          </div>
          <p>Scan this QR code for attendance</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Modal size="xsm" isOpen={isOpen} onClose={onClose} title="Student QR Code">
      <div className={styles.modalContainer}>
        <div className={styles.studentInfo}>
          <h3>{student.first_name} {student.last_name}</h3>
          <p>ID: {student.student_id} | Grade {student.grade}-{student.section}</p>
        </div>
        
        <div className={styles.qrCodeContainer}>
          <QRCodeSVG
            ref={qrRef}
            value={qrData}
            size={200}
            level="H" 
            includeMargin={true}
          />
        </div>
        
        <div className={styles.qrActions}>
          <Button
            label="Download"
            height="sm"
            width="sm"
            color="primary"
            onClick={handleDownloadQR}
          />
          <Button 
            label="Print"
            height="sm"
            width="modal"
            color="secondary"
            onClick={handlePrintQR}
          />
          <Button 
            label="Close"
            height="sm"
            width="modal"
            color="grades"
            onClick={onClose}
          />
        </div>
      </div>
    </Modal>
  );
}

export default QRCodeModal;