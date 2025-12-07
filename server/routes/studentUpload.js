import express from 'express';
import readXlsxFile from 'read-excel-file/node';
import csv from 'csv-parser';
import { excelUpload } from '../middleware/excelUpload.js';
import { supabase } from '../config/supabase.js';
import stream from 'stream';
import path from 'path';
import { formatPhilippinePhone } from '../../src/Utils/phoneValidation.js'; 
import { validateStudentData } from '../../src/Utils/StudentDataValidation.js'; 

const router = express.Router();

// CSV headers mapping
const csvHeaders = {
  lrn: ['LRN', 'lrn', 'Student LRN', 'student_lrn'],
  first_name: ['First Name', 'first_name', 'First Name', 'First_Name'],
  last_name: ['Last Name', 'last_name', 'Last Name', 'Last_Name'],
  middle_name: ['Middle Name', 'middle_name', 'Middle Name', 'Middle_Name'],
  grade: ['Grade', 'grade', 'Grade Level', 'Grade_Level'],
  section: ['Section', 'section', 'Class Section', 'Class_Section'],
  email: ['Email', 'email', 'Student Email', 'Student_Email'],
  phone_number: ['Phone Number', 'phone_number', 'Phone', 'Student Phone', 'Student_Phone'],
  
  // Guardian headers (optional)
  guardian_first_name: ['Guardian First Name', 'guardian_first_name', 'Parent First Name', 'Parent_First_Name'],
  guardian_middle_name: ['Guardian Middle Name', 'guardian_middle_name', 'Parent Middle Name', 'Parent_Middle_Name'],
  guardian_last_name: ['Guardian Last Name', 'guardian_last_name', 'Parent Last Name', 'Parent_Last_Name'],
  guardian_phone_number: ['Guardian Phone Number', 'guardian_phone_number', 'Parent Phone', 'Parent_Phone', 'Guardian Phone'],
  guardian_email: ['Guardian Email', 'guardian_email', 'Parent Email', 'Parent_Email']
};

// Helper to get value from CSV row
const getCsvValue = (data, keys) => {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key].toString().trim() !== '') {
      return data[key].toString().trim();
    }
  }
  return '';
};

// Clean data - convert empty strings to null for optional fields
const cleanStudentData = (student) => {
  const cleaned = {};
  const optionalFields = ['email', 'phone_number', 'middle_name', 'guardian_first_name', 
                         'guardian_middle_name', 'guardian_last_name', 'guardian_phone_number', 'guardian_email'];
  
  Object.keys(student).forEach(key => {
    if (student[key] !== undefined && student[key] !== null) {
      const value = student[key].toString().trim();
      // Convert empty optional fields to null, keep required fields as empty string for validation
      if (optionalFields.includes(key) && value === '') {
        cleaned[key] = null;
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = null;
    }
  });
  return cleaned;
};

// Add phone fields to Twilio format before database insertion
const formatPhoneFieldsForDatabase = (student) => {
  const formatted = { ...student };
  
  // Format student phone if present
  if (formatted.phone_number) {
    formatted.phone_number = formatPhilippinePhone(formatted.phone_number);
  }
  
  // Format guardian phone if present
  if (formatted.guardian_phone_number) {
    formatted.guardian_phone_number = formatPhilippinePhone(formatted.guardian_phone_number);
  }
  
  return formatted;
};

// ALL-OR-NOTHING UPLOAD
router.post('/upload', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or invalid file type'
      });
    }

    console.log('📁 Processing student file:', req.file.originalname);

    let rawStudentData = [];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    // Process Excel file
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      const rows = await readXlsxFile(req.file.buffer);
      console.log(`📊 Excel file has ${rows.length} rows`);
      
      if (rows.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'File is empty or has no data rows'
        });
      }
      
      const [headers, ...dataRows] = rows;
      console.log('📋 Excel headers:', headers);
      
      // Process rows with flexible header mapping
      rawStudentData = dataRows.map((row, index) => {
        // Create a map of header positions
        const headerMap = {};
        headers.forEach((header, idx) => {
          if (header) {
            const headerLower = header.toString().toLowerCase().trim();
            headerMap[headerLower] = idx;
          }
        });
        
        // Helper function to get value by header name
        const getValue = (possibleHeaders) => {
          for (const header of possibleHeaders) {
            const headerLower = header.toLowerCase().trim();
            if (headerMap[headerLower] !== undefined) {
              const value = row[headerMap[headerLower]];
              return value !== undefined && value !== null ? value.toString().trim() : '';
            }
          }
          return '';
        };
        
        const student = {
          lrn: getValue(['LRN', 'lrn', 'Student LRN', 'student_lrn']),
          first_name: getValue(['First Name', 'first_name', 'First Name', 'First_Name']),
          last_name: getValue(['Last Name', 'last_name', 'Last Name', 'Last_Name']),
          middle_name: getValue(['Middle Name', 'middle_name', 'Middle Name', 'Middle_Name']),
          grade: getValue(['Grade', 'grade', 'Grade Level', 'Grade_Level']),
          section: getValue(['Section', 'section', 'Class Section', 'Class_Section']),
          email: getValue(['Email', 'email', 'Student Email', 'Student_Email']),
          phone_number: getValue(['Phone Number', 'phone_number', 'Phone', 'Student Phone', 'Student_Phone']),
          guardian_first_name: getValue(['Guardian First Name', 'guardian_first_name', 'Parent First Name', 'Parent_First_Name']),
          guardian_middle_name: getValue(['Guardian Middle Name', 'guardian_middle_name', 'Parent Middle Name', 'Parent_Middle_Name']),
          guardian_last_name: getValue(['Guardian Last Name', 'guardian_last_name', 'Parent Last Name', 'Parent_Last_Name']),
          guardian_phone_number: getValue(['Guardian Phone Number', 'guardian_phone_number', 'Parent Phone', 'Parent_Phone', 'Guardian Phone']),
          guardian_email: getValue(['Guardian Email', 'guardian_email', 'Parent Email', 'Parent_Email'])
        };
        
        return student;
      });

    // Process CSV file
    } else if (fileExtension === '.csv') {
      rawStudentData = await new Promise((resolve, reject) => {
        const results = [];
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        
        bufferStream
          .pipe(csv())
          .on('data', (data) => {
            const student = {
              lrn: getCsvValue(data, csvHeaders.lrn),
              first_name: getCsvValue(data, csvHeaders.first_name),
              last_name: getCsvValue(data, csvHeaders.last_name),
              middle_name: getCsvValue(data, csvHeaders.middle_name),
              grade: getCsvValue(data, csvHeaders.grade),
              section: getCsvValue(data, csvHeaders.section),
              email: getCsvValue(data, csvHeaders.email),
              phone_number: getCsvValue(data, csvHeaders.phone_number),
              guardian_first_name: getCsvValue(data, csvHeaders.guardian_first_name),
              guardian_middle_name: getCsvValue(data, csvHeaders.guardian_middle_name),
              guardian_last_name: getCsvValue(data, csvHeaders.guardian_last_name),
              guardian_phone_number: getCsvValue(data, csvHeaders.guardian_phone_number),
              guardian_email: getCsvValue(data, csvHeaders.guardian_email)
            };
            results.push(student);
          })
          .on('end', () => {
            console.log(`📊 CSV file has ${results.length} rows`);
            resolve(results);
          })
          .on('error', reject);
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Please upload .xlsx, .xls, or .csv files'
      });
    }

    console.log(`📊 Found ${rawStudentData.length} raw student records`);
    
    if (rawStudentData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File contains no data rows'
      });
    }

    // ALL-OR-NOTHING VALIDATION
    const validationResults = [];
    const duplicateLRNs = new Set();
    const lrnSet = new Set();
    
    // First pass: validate all records
    rawStudentData.forEach((student, index) => {
      const rowNumber = index + 2; // +2 for header row and 1-indexing
      
      // Clean the data
      const cleanedStudent = cleanStudentData(student);
      
      // Format phone numbers for database/Twilio
      const formattedStudent = formatPhoneFieldsForDatabase(cleanedStudent);
      
      // Validate the student data using your validation function
      const validationErrors = validateStudentData(formattedStudent);
      
      // Check for duplicate LRN within the same file
      if (formattedStudent.lrn) {
        if (lrnSet.has(formattedStudent.lrn)) {
          validationErrors.lrn = `LRN ${formattedStudent.lrn} is duplicated in the file`;
          duplicateLRNs.add(formattedStudent.lrn);
        } else {
          lrnSet.add(formattedStudent.lrn);
        }
      }
      
      validationResults.push({
        row: rowNumber,
        student: formattedStudent,
        errors: validationErrors,
        isValid: Object.keys(validationErrors).length === 0
      });
    });

    // Check if ANY record has errors
    const invalidRecords = validationResults.filter(r => !r.isValid);
    const validRecords = validationResults.filter(r => r.isValid);
    
    console.log(`✅ Valid records: ${validRecords.length}`);
    console.log(`❌ Invalid records: ${invalidRecords.length}`);

    // ALL-OR-NOTHING: If ANY record is invalid, reject entire upload
    if (invalidRecords.length > 0) {
      const errorMessages = invalidRecords.map(record => 
        `Row ${record.row}: ${Object.values(record.errors).join(', ')}`
      );
      
      return res.status(400).json({
        success: false,
        error: 'File contains invalid data. Please fix all errors and try again.',
        invalidCount: invalidRecords.length,
        invalidRecords: invalidRecords.slice(0, 10).map(record => ({
          row: record.row,
          data: record.student,
          errors: record.errors
        })),
        errorSummary: errorMessages.slice(0, 5),
        summary: {
          totalRecords: rawStudentData.length,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length,
          duplicateLRNs: Array.from(duplicateLRNs)
        }
      });
    }

    // ALL RECORDS ARE VALID - proceed with upload
    const allStudents = validationResults.map(r => r.student);
    
    // Check for existing LRNs in database
    const lrns = allStudents.map(s => s.lrn).filter(lrn => lrn);
    const existingLRNs = [];
    
    if (lrns.length > 0) {
      const { data: existingStudents, error: fetchError } = await supabase
        .from('students')
        .select('lrn')
        .in('lrn', lrns);
      
      if (fetchError) {
        console.error('Error checking existing LRNs:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      } else if (existingStudents && existingStudents.length > 0) {
        existingLRNs.push(...existingStudents.map(s => s.lrn));
        console.log(`⚠️ Found ${existingLRNs.length} existing LRNs in database`);
      }
    }

    // Separate new and existing students
    const newStudents = allStudents.filter(student => !existingLRNs.includes(student.lrn));
    const existingStudents = allStudents.filter(student => existingLRNs.includes(student.lrn));

    console.log(`📝 Found ${newStudents.length} new students and ${existingStudents.length} existing students`);

    let uploadedData = [];

    // Only insert NEW students (skip existing ones)
    if (newStudents.length > 0) {
      console.log(`📝 Adding ${newStudents.length} new students to database...`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('students')
        .insert(newStudents)
        .select();

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }
      
      uploadedData = insertedData || [];
      console.log(`✅ Successfully added ${uploadedData.length} new students`);
    } else {
      console.log('ℹ️ No new students to add');
    }

    // Note: We're NOT updating existing students
    if (existingStudents.length > 0) {
      console.log(`ℹ️ Skipping ${existingStudents.length} existing students (not updated)`);
    }

    // Prepare success response
    const newRecordsCreated = uploadedData.length;
    const existingRecordsSkipped = existingStudents.length;

    const response = {
      success: true,
      message: '',
      importedCount: newRecordsCreated,
      summary: {
        totalRecords: rawStudentData.length,
        newRecordsCreated: newRecordsCreated,
        existingRecordsSkipped: existingRecordsSkipped,
        processedRecords: newRecordsCreated
      },
      newStudents: uploadedData || []
    };

    // More descriptive message
    if (newRecordsCreated === 0) {
      response.message = `No new students added. ${existingRecordsSkipped > 0 ? `All ${rawStudentData.length} students already exist in the system.` : 'File contained no valid data.'}`;
    } else if (existingRecordsSkipped === 0) {
      response.message = `Successfully added ${newRecordsCreated} new student(s)`;
    } else {
      response.message = `Successfully added ${newRecordsCreated} new student(s). ${existingRecordsSkipped} existing student(s) were not modified.`;
    }
    
    console.log(`📱 Phone numbers formatted for Twilio E.164 compatibility`);
    
    res.json(response);

  } catch (error) {
    console.error('❌ Student upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('invalid input syntax')) {
      errorMessage = 'Invalid data format in file. Please check your data.';
      statusCode = 400;
    } else if (error.message.includes('duplicate key')) {
      errorMessage = 'Duplicate LRN found in database.';
      statusCode = 409;
    } else if (error.message.includes('permission denied')) {
      errorMessage = 'Permission denied. Please check your database credentials.';
      statusCode = 403;
    } else if (error.message.includes('File contains invalid data')) {
      errorMessage = error.message;
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Student Upload API',
    timestamp: new Date().toISOString()
  });
});

export default router;