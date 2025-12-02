import express from 'express';
import readXlsxFile from 'read-excel-file/node';
import csv from 'csv-parser';
import { excelUpload } from '../middleware/excelUpload.js';
import { supabase } from '../config/supabase.js';
import stream from 'stream';
import path from 'path';

const router = express.Router();

// Helper function to process rows into student data
const processStudentRow = (row) => {
  return {
    // Student fields
    lrn: row[0] || '',
    first_name: row[1] || '',
    last_name: row[2] || '',
    middle_name: row[3] || '',
    grade: row[4] || '',
    section: row[5] || '',
    email: row[6] || '',
    phone_number: row[7] || '',
    
    // Guardian fields (assuming they're in columns 8-12)
    guardian_first_name: row[8] || '',
    guardian_middle_name: row[9] || '',
    guardian_last_name: row[10] || '',
    guardian_phone_number: row[11] || '',
    guardian_email: row[12] || ''
  };
};

// CSV headers mapping
const csvHeaders = {
  lrn: ['LRN', 'lrn'],
  first_name: ['First Name', 'first_name'],
  last_name: ['Last Name', 'last_name'],
  middle_name: ['Middle Name', 'middle_name'],
  grade: ['Grade', 'grade'],
  section: ['Section', 'section'],
  email: ['Email', 'email'],
  phone_number: ['Phone Number', 'phone_number', 'Phone'],
  // Guardian headers
  guardian_first_name: ['Guardian First Name', 'guardian_first_name'],
  guardian_middle_name: ['Guardian Middle Name', 'guardian_middle_name'],
  guardian_last_name: ['Guardian Last Name', 'guardian_last_name'],
  guardian_phone_number: ['Guardian Phone Number', 'guardian_phone_number'],
  guardian_email: ['Guardian Email', 'guardian_email']
};

// Helper to get value from CSV row
const getCsvValue = (data, keys) => {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== '') {
      return data[key];
    }
  }
  return '';
};

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
      
      studentData = dataRows.map(row => processStudentRow(row));

    } else if (fileExtension === '.csv') {
      studentData = await new Promise((resolve, reject) => {
        const results = [];
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        
        bufferStream
          .pipe(csv())
          .on('data', (data) => {
            const student = {
              // Student fields
              lrn: getCsvValue(data, csvHeaders.lrn),
              first_name: getCsvValue(data, csvHeaders.first_name),
              last_name: getCsvValue(data, csvHeaders.last_name),
              middle_name: getCsvValue(data, csvHeaders.middle_name),
              grade: getCsvValue(data, csvHeaders.grade),
              section: getCsvValue(data, csvHeaders.section),
              email: getCsvValue(data, csvHeaders.email),
              phone_number: getCsvValue(data, csvHeaders.phone_number),
              
              // Guardian fields
              guardian_first_name: getCsvValue(data, csvHeaders.guardian_first_name),
              guardian_middle_name: getCsvValue(data, csvHeaders.guardian_middle_name),
              guardian_last_name: getCsvValue(data, csvHeaders.guardian_last_name),
              guardian_phone_number: getCsvValue(data, csvHeaders.guardian_phone_number),
              guardian_email: getCsvValue(data, csvHeaders.guardian_email)
            };
            results.push(student);
          })
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    }

    console.log(`📊 Found ${studentData.length} students with guardian data`);

    if (studentData.length > 0) {
      console.log('📝 Student data to upsert:', studentData);
      
      const { data, error } = await supabase
        .from('students')
        .upsert(studentData, { 
          onConflict: 'lrn', 
          ignoreDuplicates: true    
        })
        .select();

      if (error) throw error;

      console.log('✅ Students with guardians returned from Supabase:', data);
      
      res.json({ 
        success: true,
        message: `${data.length} students imported successfully with guardian information!`,
        importedCount: data.length,
        newStudents: data
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