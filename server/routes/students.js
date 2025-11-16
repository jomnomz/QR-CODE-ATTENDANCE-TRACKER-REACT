import express from 'express';
import readXlsxFile from 'read-excel-file/node';
import csv from 'csv-parser';
import { excelUpload } from '../middleware/excelUpload.js';
import { supabase } from '../config/supabase.js';
import stream from 'stream';
import path from 'path';

const router = express.Router();

router.post('/upload', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or invalid file type'
      });
    }

    console.log('📁 Processing student file:', req.file.originalname);

    let studentData = [];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      const rows = await readXlsxFile(req.file.buffer);
      const [headers, ...dataRows] = rows;
      
      studentData = dataRows.map(row => ({
        student_id: row[0] || '',      
        first_name: row[1] || '',
        last_name: row[2] || '',
        middle_name: row[3] || '',
        grade: row[4] || '',           
        section: row[5] || '',        
        email: row[6] || '',
        phone_number: row[7] || ''
      }));

    } else if (fileExtension === '.csv') {
      studentData = await new Promise((resolve, reject) => {
        const results = [];
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        
        bufferStream
          .pipe(csv())
          .on('data', (data) => results.push({
            student_id: data['Student ID'] || data['student_id'] || '',
            first_name: data['First Name'] || data['first_name'] || '',
            last_name: data['Last Name'] || data['last_name'] || '',
            middle_name: data['Middle Name'] || data['middle_name'] || '',
            grade: data['Grade'] || data['grade'] || '',           
            section: data['Section'] || data['section'] || '',     
            email: data['Email'] || data['email'] || '',
            phone_number: data['Phone Number'] || data['phone_number'] || ''
          }))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    }

    console.log(`📊 Found ${studentData.length} students`);

    if (studentData.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .upsert(studentData, { 
          onConflict: 'student_id', 
          ignoreDuplicates: true    
        })
        .select();

      if (error) throw error;

      res.json({ 
        success: true,
        message: `${data.length} students imported successfully!`,
        importedCount: data.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No valid student data found'
      });
    }

  } catch (error) {
    console.error('❌ Student upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;