import express from 'express';
import readXlsxFile from 'read-excel-file/node';
import csv from 'csv-parser';
import { excelUpload } from '../middleware/excelUpload.js';
import { supabase } from '../config/supabase.js';
import stream from 'stream';
import path from 'path';

const router = express.Router();

// Validation function for teachers
const validateTeacherData = (teacherData) => {
  const errors = {};
  
  // REQUIRED FIELDS
  if (!teacherData.employee_id?.toString().trim()) {
    errors.employee_id = 'Employee ID is required';
  }
  
  if (!teacherData.first_name?.toString().trim()) {
    errors.first_name = 'First name is required';
  }
  
  if (!teacherData.last_name?.toString().trim()) {
    errors.last_name = 'Last name is required';
  }
  
  // Optional fields - validate if provided
  if (teacherData.email_address && !/\S+@\S+\.\S+/.test(teacherData.email_address.toString())) {
    errors.email_address = 'Email address is invalid';
  }
  
  // Phone validation - accepts Philippine mobile numbers and international formats
  if (teacherData.phone_no) {
    const phoneStr = teacherData.phone_no.toString().trim();
    const digitsOnly = phoneStr.replace(/\D/g, '');
    
    // Remove leading 0 and check if it's 11 digits (Philippine mobile: 09XXXXXXXXX)
    if (phoneStr.startsWith('09') && digitsOnly.length === 11) {
      // Valid Philippine mobile number starting with 09
    } 
    // Check for +639 format
    else if ((phoneStr.startsWith('+639') || phoneStr.startsWith('639')) && digitsOnly.length === 12) {
      // Valid Philippine mobile number with country code
    }
    // Check for other international formats (10-15 digits)
    else if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      // Valid international number
    } else {
      errors.phone_no = 'Phone number must be 10-15 digits. For Philippine numbers, use 09XXXXXXXXX or +639XXXXXXXXX';
    }
  }
  
  return errors;
};

// CSV headers mapping for teachers
const csvHeaders = {
  employee_id: ['Employee ID', 'employee_id', 'Employee_ID', 'ID Number', 'ID_Number', 'ID'],
  first_name: ['First Name', 'first_name', 'First_Name', 'Given Name', 'Given_Name', 'First'],
  last_name: ['Last Name', 'last_name', 'Last_Name', 'Surname', 'Family Name', 'Family_Name', 'Last'],
  middle_name: ['Middle Name', 'middle_name', 'Middle_Name', 'Middle Initial', 'Middle_Initial', 'Middle', 'MI'],
  email_address: ['Email', 'Email Address', 'email_address', 'Email_Address', 'email', 'E-mail'],
  phone_no: ['Phone', 'Phone Number', 'phone_no', 'Phone_Number', 'Contact Number', 'Contact_Number', 'Mobile', 'Cell', 'Cellphone'],
  status: ['Status', 'status', 'Account Status', 'Account_Status']
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
const cleanTeacherData = (teacher) => {
  const cleaned = {};
  const optionalFields = ['email_address', 'phone_no', 'middle_name', 'status'];
  
  Object.keys(teacher).forEach(key => {
    if (teacher[key] !== undefined && teacher[key] !== null) {
      const value = teacher[key].toString().trim();
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

// Format phone number consistently for database
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  const phoneStr = phone.toString().trim();
  const digitsOnly = phoneStr.replace(/\D/g, '');
  
  // Convert Philippine numbers to +639 format for consistency
  if (digitsOnly.length === 11 && digitsOnly.startsWith('09')) {
    return '+63' + digitsOnly.substring(1);
  }
  
  // If it's 10 digits and starts with 9, assume Philippine number without 0
  if (digitsOnly.length === 10 && digitsOnly.startsWith('9')) {
    return '+63' + digitsOnly;
  }
  
  // If it's 12 digits and starts with 63, add +
  if (digitsOnly.length === 12 && digitsOnly.startsWith('63')) {
    return '+' + digitsOnly;
  }
  
  // Return original if it already has +, otherwise return as-is
  return phoneStr.startsWith('+') ? phoneStr : '+' + digitsOnly;
};

// Validate status field
const validateStatus = (status) => {
  if (!status) return null;
  const statusLower = status.toString().toLowerCase().trim();
  const validStatuses = ['pending', 'active', 'inactive'];
  return validStatuses.includes(statusLower) ? statusLower : null;
};

// ALL-OR-NOTHING UPLOAD FOR TEACHERS
router.post('/upload', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or invalid file type'
      });
    }

    console.log('📁 Processing teacher file:', req.file.originalname);

    let rawTeacherData = [];
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
      
      // Map headers to lowercase for easier matching
      const headerMap = {};
      headers.forEach((header, index) => {
        if (header) {
          const headerLower = header.toString().toLowerCase().trim();
          headerMap[headerLower] = index;
        }
      });
      
      console.log('🔍 Header mapping:', headerMap);
      
      rawTeacherData = dataRows.map((row, index) => {
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
        
        const teacher = {
          employee_id: getValue(['Employee ID', 'employee_id', 'Employee_ID', 'ID Number', 'ID_Number', 'ID']),
          first_name: getValue(['First Name', 'first_name', 'First_Name', 'Given Name', 'Given_Name', 'First']),
          last_name: getValue(['Last Name', 'last_name', 'Last_Name', 'Surname', 'Family Name', 'Family_Name', 'Last']),
          middle_name: getValue(['Middle Name', 'middle_name', 'Middle_Name', 'Middle Initial', 'Middle_Initial', 'Middle', 'MI']),
          email_address: getValue(['Email', 'Email Address', 'email_address', 'Email_Address', 'email', 'E-mail']),
          phone_no: getValue(['Phone', 'Phone Number', 'phone_no', 'Phone_Number', 'Contact Number', 'Contact_Number', 'Mobile', 'Cell', 'Cellphone']),
          status: getValue(['Status', 'status', 'Account Status', 'Account_Status'])
        };
        
        return teacher;
      });

    // Process CSV file
    } else if (fileExtension === '.csv') {
      rawTeacherData = await new Promise((resolve, reject) => {
        const results = [];
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        
        bufferStream
          .pipe(csv())
          .on('data', (data) => {
            const teacher = {
              employee_id: getCsvValue(data, csvHeaders.employee_id),
              first_name: getCsvValue(data, csvHeaders.first_name),
              last_name: getCsvValue(data, csvHeaders.last_name),
              middle_name: getCsvValue(data, csvHeaders.middle_name),
              email_address: getCsvValue(data, csvHeaders.email_address),
              phone_no: getCsvValue(data, csvHeaders.phone_no),
              status: getCsvValue(data, csvHeaders.status)
            };
            results.push(teacher);
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

    console.log(`📊 Found ${rawTeacherData.length} raw teacher records`);
    
    if (rawTeacherData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File contains no data rows'
      });
    }

    // DEBUG: Show sample data
    console.log('\n🔍 Sample data (first 2 rows):');
    rawTeacherData.slice(0, 2).forEach((teacher, index) => {
      console.log(`Row ${index + 2}:`, JSON.stringify(teacher, null, 2));
    });

    // ALL-OR-NOTHING VALIDATION
    const validationResults = [];
    const duplicateEmployeeIds = new Set();
    const employeeIdSet = new Set();
    const duplicateEmails = new Set();
    const emailSet = new Set();
    
    // First pass: validate all records
    rawTeacherData.forEach((teacher, index) => {
      const rowNumber = index + 2; // +2 for header row and 1-indexing
      
      // Clean the data
      const cleanedTeacher = cleanTeacherData(teacher);
      
      // Format phone number if provided
      if (cleanedTeacher.phone_no) {
        cleanedTeacher.phone_no = formatPhoneNumber(cleanedTeacher.phone_no);
      }
      
      // Validate and normalize status
      if (cleanedTeacher.status) {
        const normalizedStatus = validateStatus(cleanedTeacher.status);
        if (normalizedStatus) {
          cleanedTeacher.status = normalizedStatus;
        } else {
          // Invalid status value
          cleanedTeacher.status = null;
        }
      }
      
      // Validate the teacher data
      const validationErrors = validateTeacherData(cleanedTeacher);
      
      // Check for duplicate Employee ID within the same file
      if (cleanedTeacher.employee_id) {
        if (employeeIdSet.has(cleanedTeacher.employee_id)) {
          validationErrors.employee_id = `Employee ID ${cleanedTeacher.employee_id} is duplicated in the file`;
          duplicateEmployeeIds.add(cleanedTeacher.employee_id);
        } else {
          employeeIdSet.add(cleanedTeacher.employee_id);
        }
      }
      
      // Check for duplicate Email within the same file (if provided)
      if (cleanedTeacher.email_address) {
        if (emailSet.has(cleanedTeacher.email_address)) {
          validationErrors.email_address = `Email ${cleanedTeacher.email_address} is duplicated in the file`;
          duplicateEmails.add(cleanedTeacher.email_address);
        } else {
          emailSet.add(cleanedTeacher.email_address);
        }
      }
      
      validationResults.push({
        row: rowNumber,
        teacher: cleanedTeacher,
        errors: validationErrors,
        isValid: Object.keys(validationErrors).length === 0
      });
    });

    // Check if ANY record has errors
    const invalidRecords = validationResults.filter(r => !r.isValid);
    const validRecords = validationResults.filter(r => r.isValid);
    
    console.log(`\n📊 Validation Summary:`);
    console.log(`✅ Valid records: ${validRecords.length}`);
    console.log(`❌ Invalid records: ${invalidRecords.length}`);
    
    // Show first few errors if any
    if (invalidRecords.length > 0) {
      console.log('\n❌ First 3 errors found:');
      invalidRecords.slice(0, 3).forEach(record => {
        console.log(`Row ${record.row}:`, record.errors);
      });
    }

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
          data: record.teacher,
          errors: record.errors
        })),
        errorSummary: errorMessages.slice(0, 5),
        summary: {
          totalRecords: rawTeacherData.length,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length,
          duplicateEmployeeIds: Array.from(duplicateEmployeeIds),
          duplicateEmails: Array.from(duplicateEmails)
        }
      });
    }

    // ALL RECORDS ARE VALID - proceed with upload
    const allTeachers = validationResults.map(r => r.teacher);
    
    // Check for existing Employee IDs and Emails in database
    const employeeIds = allTeachers.map(t => t.employee_id).filter(id => id);
    const emails = allTeachers.map(t => t.email_address).filter(email => email);
    
    const existingEmployeeIds = [];
    const existingEmails = [];
    
    if (employeeIds.length > 0) {
      const { data: existingTeachersById, error: fetchErrorId } = await supabase
        .from('teachers')
        .select('employee_id')
        .in('employee_id', employeeIds);
      
      if (fetchErrorId) {
        console.error('Error checking existing Employee IDs:', fetchErrorId);
        throw new Error(`Database error: ${fetchErrorId.message}`);
      } else if (existingTeachersById && existingTeachersById.length > 0) {
        existingEmployeeIds.push(...existingTeachersById.map(t => t.employee_id));
        console.log(`⚠️ Found ${existingEmployeeIds.length} existing Employee IDs in database`);
      }
    }
    
    if (emails.length > 0) {
      const { data: existingTeachersByEmail, error: fetchErrorEmail } = await supabase
        .from('teachers')
        .select('email_address')
        .in('email_address', emails.filter(email => email !== null));
      
      if (fetchErrorEmail) {
        console.error('Error checking existing Emails:', fetchErrorEmail);
        throw new Error(`Database error: ${fetchErrorEmail.message}`);
      } else if (existingTeachersByEmail && existingTeachersByEmail.length > 0) {
        existingEmails.push(...existingTeachersByEmail.map(t => t.email_address));
        console.log(`⚠️ Found ${existingEmails.length} existing Emails in database`);
      }
    }

    // Separate new and existing teachers
    const newTeachers = allTeachers.filter(teacher => !existingEmployeeIds.includes(teacher.employee_id));
    const existingTeachers = allTeachers.filter(teacher => existingEmployeeIds.includes(teacher.employee_id));

    console.log(`\n📝 Database Summary:`);
    console.log(`📋 New teachers to insert: ${newTeachers.length}`);
    console.log(`📋 Existing teachers (skipped): ${existingTeachers.length}`);

    let uploadedData = [];

    // Only insert NEW teachers (skip existing ones)
    if (newTeachers.length > 0) {
      console.log(`\n💾 Adding ${newTeachers.length} new teachers to database...`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('teachers')
        .insert(newTeachers)
        .select();

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }
      
      uploadedData = insertedData || [];
      console.log(`✅ Successfully added ${uploadedData.length} new teachers`);
    } else {
      console.log('ℹ️ No new teachers to add');
    }

    // Note: We're NOT updating existing teachers
    if (existingTeachers.length > 0) {
      console.log(`ℹ️ Skipping ${existingTeachers.length} existing teachers (not updated)`);
    }

    // Prepare success response
    const newRecordsCreated = uploadedData.length;
    const existingRecordsSkipped = existingTeachers.length;

    const response = {
      success: true,
      hasNewRecords: newRecordsCreated > 0,
      message: '',
      importedCount: newRecordsCreated,
      summary: {
        totalRecords: rawTeacherData.length,
        newRecordsCreated: newRecordsCreated,
        existingRecordsSkipped: existingRecordsSkipped,
        processedRecords: newRecordsCreated
      },
      newTeachers: uploadedData || []
    };

    // Set message based on result
    if (newRecordsCreated === 0) {
      response.message = `No new teachers added. ${existingRecordsSkipped > 0 ? `All ${rawTeacherData.length} teachers already exist in the system.` : 'File contained no valid data.'}`;
    } else if (existingRecordsSkipped === 0) {
      response.message = `Successfully added ${newRecordsCreated} new teacher(s)`;
    } else {
      response.message = `Successfully added ${newRecordsCreated} new teacher(s). ${existingRecordsSkipped} existing teacher(s) were not modified.`;
    }

    console.log(`\n🎉 Upload completed: ${response.message}`);
    res.json(response);

  } catch (error) {
    console.error('\n❌ Teacher upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('invalid input syntax')) {
      errorMessage = 'Invalid data format in file. Please check your data.';
      statusCode = 400;
    } else if (error.message.includes('duplicate key')) {
      errorMessage = 'Duplicate Employee ID or Email found in database.';
      statusCode = 409;
    } else if (error.message.includes('permission denied')) {
      errorMessage = 'Permission denied. Please check your database credentials.';
      statusCode = 403;
    } else if (error.message.includes('File contains invalid data')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('check constraint')) {
      errorMessage = 'Invalid status value. Status must be one of: pending, active, inactive.';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/accept-invitation', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    console.log(`✅ Teacher accepting invitation: ${email}`);
    
    // Update teacher status to active
    const { error: teacherError } = await supabase
      .from('teachers')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email_address', email);
    
    if (teacherError) {
      console.error('❌ Error updating teacher status:', teacherError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update teacher status' 
      });
    }
    
    // Update users table status
    const { error: userError } = await supabase
      .from('users')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (userError) {
      console.error('⚠️ Error updating users table:', userError);
      // Continue anyway since teacher update succeeded
    }
    
    console.log(`✅ Updated ${email} to active status`);
    
    res.json({
      success: true,
      message: 'Account activated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Teacher Upload API',
    timestamp: new Date().toISOString()
  });
});

export default router;