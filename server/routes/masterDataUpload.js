import express from 'express';
import readXlsxFile from 'read-excel-file/node';
import csv from 'csv-parser';
import { excelUpload } from '../middleware/excelUpload.js';
import { supabase } from '../config/supabase.js';
import stream from 'stream';
import path from 'path';

const router = express.Router();

const csvHeaders = {
  grade: ['Grade', 'grade', 'Grade Level', 'Grade_Level', 'Level'],
  section: ['Section', 'section', 'Section Name', 'Section_Name', 'Class'],
  room: ['Room', 'room', 'Room Number', 'Room_Number', 'Classroom'],
  subject_code: ['Subject Code', 'subject_code', 'Subject_Code', 'Code'],
  subject_name: ['Subject Name', 'subject_name', 'Subject_Name', 'Subject'],
  class_start: ['Class Start', 'class_start', 'Start Time', 'Start_Time', 'Start'],
  class_end: ['Class End', 'class_end', 'End Time', 'End_Time', 'End'],
  grace_period: ['Grace Period', 'grace_period', 'Grace Period (minutes)', 'Grace_Period', 'Grace Minutes']
};

const getCsvValue = (data, keys) => {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key].toString().trim() !== '') {
      return data[key].toString().trim();
    }
  }
  return '';
};

const cleanData = (data) => {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      let value = data[key];
      
      if (value instanceof Date) {
        const hours = value.getHours().toString().padStart(2, '0');
        const minutes = value.getMinutes().toString().padStart(2, '0');
        value = `${hours}:${minutes}`;
      } else {
        value = value.toString().trim();
      }
      
      if (key === 'grade' || key === 'grade_level' || key.toLowerCase().includes('grade')) {
        const numMatch = value.match(/\d+/);
        if (numMatch) {
          value = numMatch[0];
        }
        value = value.replace(/\D/g, '');
      }
      
      if ((key === 'room' || key === 'room_number') && (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'n/a' || value === '')) {
        value = 'TBD';
      }
      
      if ((key === 'grace_period' || key.toLowerCase().includes('grace')) && value) {
        const numMatch = value.match(/\d+/);
        value = numMatch ? numMatch[0] : '15';
      }
      
      cleaned[key] = value === '' ? null : value;
    } else {
      cleaned[key] = null;
    }
  });
  return cleaned;
};

const validateMasterData = (type, data) => {
  const errors = {};
  
  if (type === 'grades_sections_rooms') {
    if (!data.grade) errors.grade = 'Grade is required';
    if (!data.section) errors.section = 'Section is required';
    
    if (data.grade && !data.grade.match(/^\d+$/)) {
      errors.grade = 'Grade must be a number (e.g., 7, 8, 9, 10)';
    }
    
  } else if (type === 'subjects') {
    if (!data.subject_code) errors.subject_code = 'Subject code is required';
    if (!data.subject_name) errors.subject_name = 'Subject name is required';
    
  } else if (type === 'grade_schedules') {
    if (!data.grade) errors.grade = 'Grade is required';
    if (!data.class_start) errors.class_start = 'Class start time is required';
    if (!data.class_end) errors.class_end = 'Class end time is required';
    
    if (data.class_start && !data.class_start.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      errors.class_start = 'Class start must be in HH:MM 24-hour format';
    }
    
    if (data.class_end && !data.class_end.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      errors.class_end = 'Class end must be in HH:MM 24-hour format';
    }
    
    if (data.class_start && data.class_end) {
      const start = new Date(`2000-01-01T${data.class_start}`);
      const end = new Date(`2000-01-01T${data.class_end}`);
      
      if (start >= end) {
        errors.class_times = 'Class start time must be before class end time';
      }
    }
    
    if (data.grace_period) {
      const grace = parseInt(data.grace_period);
      if (isNaN(grace) || grace < 0 || grace > 120) {
        errors.grace_period = 'Grace period must be a number between 0 and 120 minutes';
      }
    }
  }
  
  return errors;
};

const processMasterDataExcel = async (buffer) => {
  try {
    const sheets = await readXlsxFile(buffer, { getSheets: true });
    
    if (!sheets || sheets.length === 0) {
      throw new Error('No sheets found in the Excel file');
    }

    console.log(`📑 Found ${sheets.length} sheet(s):`, sheets.map(s => s.name));

    const allData = {
      grades_sections_rooms: [],
      subjects: [],
      grade_schedules: []
    };

    for (const sheet of sheets) {
      console.log(`📄 Processing sheet: "${sheet.name}"`);
      const rows = await readXlsxFile(buffer, { sheet: sheet.name });
      
      if (rows.length < 2) {
        console.log(`⚠️ Sheet "${sheet.name}" has insufficient data rows (${rows.length})`);
        continue;
      }

      console.log(`📊 Sheet "${sheet.name}" has ${rows.length} rows (including header)`);

      const [headers, ...dataRows] = rows;
      console.log(`🔍 Headers in "${sheet.name}":`, headers.map(h => h?.toString()));
      
      const headerMap = {};
      
      headers.forEach((header, index) => {
        if (header) {
          const headerStr = header.toString().toLowerCase().trim();
          headerMap[headerStr] = index;
        }
      });

      const getValue = (row, possibleHeaders) => {
        for (const header of possibleHeaders) {
          const headerLower = header.toLowerCase().trim();
          if (headerMap[headerLower] !== undefined) {
            const value = row[headerMap[headerLower]];
            
            if (value !== undefined && value !== null) {
              if (value instanceof Date) {
                const hours = value.getHours().toString().padStart(2, '0');
                const minutes = value.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
              }
              
              return value.toString().trim();
            }
            return '';
          }
        }
        return '';
      };

      const hasClassStart = getValue(headers, [
        'Class Start', 'Start Time', 'Start_Time', 'Start', 'class start'
      ]) !== '';
      
      const hasClassEnd = getValue(headers, [
        'Class End', 'End Time', 'End_Time', 'End', 'class end'
      ]) !== '';
      
      const hasGracePeriod = getValue(headers, [
        'Grace Period', 'Grace Period (minutes)', 'Grace_Period', 'Grace Minutes', 'grace period'
      ]) !== '';
      
      const hasGrade = getValue(headers, [
        'Grade Level', 'Grade', 'Grade_Level', 'grade level', 
        'Level', 'Class Level', 'Class'
      ]) !== '';
      
      const hasSection = getValue(headers, [
        'Section Name', 'Section', 'Section_Name', 'section name', 'Class'
      ]) !== '';
      
      const hasRoom = getValue(headers, [
        'Room', 'Room Number', 'Room_Number', 'room', 'room number', 'classroom'
      ]) !== '';
      
      const hasSubjectCode = getValue(headers, [
        'Subject Code', 'Code', 'Subject_Code', 'subject code'
      ]) !== '';
      
      const hasSubjectName = getValue(headers, [
        'Subject Name', 'Subject', 'Subjects', 'Subject_Name', 'subject name'
      ]) !== '';

      console.log(`📋 Sheet "${sheet.name}" analysis:`);
      console.log(`   Has Grade: ${hasGrade}`);
      console.log(`   Has Section: ${hasSection}`);
      console.log(`   Has Room: ${hasRoom}`);
      console.log(`   Has Class Start: ${hasClassStart}`);
      console.log(`   Has Class End: ${hasClassEnd}`);
      console.log(`   Has Grace Period: ${hasGracePeriod}`);
      console.log(`   Has Subject Code: ${hasSubjectCode}`);
      console.log(`   Has Subject Name: ${hasSubjectName}`);

      if (hasGrade && hasClassStart && hasClassEnd) {
        console.log(`⏰ Processing Grade Schedules from sheet: "${sheet.name}"`);
        
        let count = 0;
        dataRows.forEach((row, index) => {
          const grade = getValue(row, ['Grade Level', 'Grade', 'Grade_Level', 'grade level', 'Level', 'Class']);
          const classStart = getValue(row, ['Class Start', 'Start Time', 'Start_Time', 'Start', 'class start']);
          const classEnd = getValue(row, ['Class End', 'End Time', 'End_Time', 'End', 'class end']);
          const gracePeriod = getValue(row, ['Grace Period', 'Grace Period (minutes)', 'Grace_Period', 'Grace Minutes', 'grace period']);
          
          if (grade && classStart && classEnd) {
            allData.grade_schedules.push({
              grade: grade,
              class_start: classStart,
              class_end: classEnd,
              grace_period: gracePeriod || '15'
            });
            count++;
            console.log(`   Row ${index + 1}: Grade="${grade}", Start="${classStart}", End="${classEnd}", Grace="${gracePeriod || '15'}"`);
          } else if (grade && (classStart || classEnd)) {
            console.log(`   ⚠️ Row ${index + 1}: Incomplete schedule data - Grade="${grade}", Start="${classStart}", End="${classEnd}"`);
          }
        });
        
        console.log(`✅ Extracted ${count} grade schedule records from "${sheet.name}"`);
        
      } else if (hasGrade && hasSection) {
        console.log(`📊 Processing Grades, Sections & Rooms from sheet: "${sheet.name}"`);
        
        let count = 0;
        dataRows.forEach((row, index) => {
          const grade = getValue(row, ['Grade Level', 'Grade', 'Grade_Level', 'grade level', 'Level', 'Class']);
          const section = getValue(row, ['Section Name', 'Section', 'Section_Name', 'section name', 'Class']);
          const room = getValue(row, ['Room', 'Room Number', 'Room_Number', 'room', 'room number', 'classroom']);
          
          if (grade && section) {
            allData.grades_sections_rooms.push({
              grade: grade,
              section: section,
              room: room || 'TBD'
            });
            count++;
            console.log(`   Row ${index + 1}: Grade="${grade}", Section="${section}", Room="${room || 'TBD'}"`);
          } else if (grade || section) {
            console.log(`   ⚠️ Row ${index + 1}: Incomplete data - Grade="${grade}", Section="${section}"`);
          }
        });
        
        console.log(`✅ Extracted ${count} grade/section/room records from "${sheet.name}"`);
        
      } else if (hasSubjectCode && hasSubjectName) {
        console.log(`📚 Processing Subjects from sheet: "${sheet.name}"`);
        
        let count = 0;
        dataRows.forEach((row, index) => {
          const subjectCode = getValue(row, ['Subject Code', 'Code', 'Subject_Code', 'subject code']);
          const subjectName = getValue(row, ['Subject Name', 'Subject', 'Subjects', 'Subject_Name', 'subject name']);
          
          if (subjectCode && subjectName) {
            allData.subjects.push({
              subject_code: subjectCode,
              subject_name: subjectName
            });
            count++;
          }
        });
        
        console.log(`✅ Extracted ${count} subject records from "${sheet.name}"`);
      } else {
        console.log(`⚠️ Sheet "${sheet.name}" has unrecognized format.`);
      }
    }

    console.log(`\n📈 Extraction Summary:`);
    console.log(`   Grades/Sections/Rooms: ${allData.grades_sections_rooms.length} records`);
    console.log(`   Subjects: ${allData.subjects.length} records`);
    console.log(`   Grade Schedules: ${allData.grade_schedules.length} records`);

    if (allData.grades_sections_rooms.length > 0) {
      console.log('\n📝 Sample Grades/Sections/Rooms data (first 3):');
      allData.grades_sections_rooms.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. Grade: "${item.grade}", Section: "${item.section}", Room: "${item.room}"`);
      });
    }

    if (allData.grade_schedules.length > 0) {
      console.log('\n⏰ Sample Grade Schedules data (first 3):');
      allData.grade_schedules.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. Grade: "${item.grade}", Start: "${item.class_start}", End: "${item.class_end}", Grace: "${item.grace_period}"`);
      });
    }

    const hasGradesSectionsRooms = allData.grades_sections_rooms.length > 0;
    const hasSubjects = allData.subjects.length > 0;
    const hasGradeSchedules = allData.grade_schedules.length > 0;

    const dataTypes = [];
    if (hasGradesSectionsRooms) dataTypes.push('grades_sections_rooms');
    if (hasSubjects) dataTypes.push('subjects');
    if (hasGradeSchedules) dataTypes.push('grade_schedules');

    if (dataTypes.length === 0) {
      throw new Error('No valid data found in any sheet. Please check your file format.');
    }

    return {
      type: dataTypes.length === 1 ? dataTypes[0] : 'multiple',
      ...allData
    };
    
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw new Error(`Error processing Excel file: ${error.message}`);
  }
};

const processMasterDataCSV = async (buffer) => {
  return new Promise((resolve, reject) => {
    const gradesSectionsRooms = [];
    const subjects = [];
    const gradeSchedules = [];
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    bufferStream
      .pipe(csv())
      .on('data', (data) => {
        const grade = getCsvValue(data, csvHeaders.grade);
        const subjectCode = getCsvValue(data, csvHeaders.subject_code);
        const classStart = getCsvValue(data, csvHeaders.class_start);
        
        if (grade && classStart) {
          gradeSchedules.push({
            grade: grade,
            class_start: classStart,
            class_end: getCsvValue(data, csvHeaders.class_end),
            grace_period: getCsvValue(data, csvHeaders.grace_period) || '15'
          });
        } else if (grade && !classStart) {
          const room = getCsvValue(data, csvHeaders.room) || 'TBD';
          gradesSectionsRooms.push({
            grade: grade,
            section: getCsvValue(data, csvHeaders.section),
            room: room
          });
        } else if (subjectCode) {
          subjects.push({
            subject_code: subjectCode,
            subject_name: getCsvValue(data, csvHeaders.subject_name)
          });
        }
      })
      .on('end', () => {
        console.log(`CSV Summary: Grades/Sections/Rooms: ${gradesSectionsRooms.length}, Subjects: ${subjects.length}, Grade Schedules: ${gradeSchedules.length}`);
        
        const data = {
          grades_sections_rooms: gradesSectionsRooms,
          subjects: subjects,
          grade_schedules: gradeSchedules
        };
        
        const dataTypes = [];
        if (gradesSectionsRooms.length > 0) dataTypes.push('grades_sections_rooms');
        if (subjects.length > 0) dataTypes.push('subjects');
        if (gradeSchedules.length > 0) dataTypes.push('grade_schedules');
        
        if (dataTypes.length === 0) {
          resolve({ type: 'unknown', data: {} });
        } else if (dataTypes.length === 1) {
          resolve({ 
            type: dataTypes[0], 
            ...data 
          });
        } else {
          resolve({ 
            type: 'multiple', 
            ...data 
          });
        }
      })
      .on('error', reject);
  });
};

const importGradesSectionsRooms = async (data) => {
  const results = {
    grades: { inserted: 0, errors: [], details: [] },
    rooms: { inserted: 0, errors: [], details: [] },
    sections: { inserted: 0, errors: [], details: [] }
  };
  
  try {
    console.log(`🔄 Starting import of ${data.length} grade/section/room records`);
    
    console.log('First 3 rows of raw data:', data.slice(0, 3));
    
    const cleanedData = data.map(item => {
      const cleaned = cleanData(item);
      console.log(`Cleaned: ${item.grade} -> "${cleaned.grade}", Section: "${cleaned.section}", Room: "${cleaned.room}"`);
      return cleaned;
    });
    
    const uniqueGrades = [...new Set(cleanedData.map(item => item.grade))];
    const uniqueRooms = [...new Set(cleanedData.map(item => item.room || 'TBD'))];
    
    console.log(`📚 Unique grades after cleaning:`, uniqueGrades);
    console.log(`🏫 Unique rooms after cleaning:`, uniqueRooms);

    console.log('\n🏫 Step 1: Processing rooms...');
    const roomMap = {}; 
    
    for (const roomName of uniqueRooms) {
      let cleanedRoom = roomName.toString().trim();
      if (!cleanedRoom || cleanedRoom === '') {
        cleanedRoom = 'TBD';
      }
      
      console.log(`📤 Inserting room: "${cleanedRoom}"`);
      
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .insert({ 
            room_number: cleanedRoom 
          })
          .select('id, room_number');
          
        if (roomError) {
          if (roomError.code === '23505') {
            console.log(`Room "${cleanedRoom}" already exists, fetching ID...`);
            const { data: existingRoom } = await supabase
              .from('rooms')
              .select('id, room_number')
              .eq('room_number', cleanedRoom)
              .single();
              
            if (existingRoom) {
              roomMap[cleanedRoom] = existingRoom.id;
              console.log(`✅ Room "${cleanedRoom}" exists with ID: ${existingRoom.id}`);
              results.rooms.inserted++;
            }
          } else {
            console.log(`❌ Room insert error for "${cleanedRoom}":`, roomError);
            results.rooms.errors.push({ room: cleanedRoom, error: roomError.message });
          }
        } else if (roomData && roomData.length > 0) {
          const roomId = roomData[0].id;
          roomMap[cleanedRoom] = roomId;
          console.log(`✅ Room "${cleanedRoom}" inserted with ID: ${roomId}`);
          results.rooms.inserted++;
          results.rooms.details.push({ room: cleanedRoom, room_id: roomId });
        }
      } catch (error) {
        console.log(`❌ Exception during room insert:`, error);
        results.rooms.errors.push({ room: cleanedRoom, error: error.message });
      }
    }

    console.log('\n📚 Step 2: Processing grades...');
    const gradeMap = {}; 
    
    for (const gradeName of uniqueGrades) {
      console.log(`📤 Inserting grade: "${gradeName}"`);
      
      try {
        const { data: gradeData, error: gradeError } = await supabase
          .from('grades')
          .insert({ 
            grade_level: gradeName 
          })
          .select('id, grade_level');
          
        if (gradeError) {
          if (gradeError.code === '23505') {
            console.log(`Grade "${gradeName}" already exists, fetching ID...`);
            const { data: existingGrade } = await supabase
              .from('grades')
              .select('id, grade_level')
              .eq('grade_level', gradeName)
              .single();
              
            if (existingGrade) {
              gradeMap[gradeName.toLowerCase()] = existingGrade.id;
              console.log(`✅ Grade "${gradeName}" exists with ID: ${existingGrade.id}`);
              results.grades.inserted++;
            }
          } else {
            console.log(`❌ Grade insert error for "${gradeName}":`, gradeError);
            results.grades.errors.push({ grade: gradeName, error: gradeError.message });
          }
        } else if (gradeData && gradeData.length > 0) {
          const gradeId = gradeData[0].id;
          gradeMap[gradeName.toLowerCase()] = gradeId;
          console.log(`✅ Grade "${gradeName}" inserted with ID: ${gradeId}`);
          results.grades.inserted++;
          results.grades.details.push({ grade: gradeName, grade_id: gradeId });
        }
      } catch (error) {
        console.log(`❌ Exception during grade insert:`, error);
        results.grades.errors.push({ grade: gradeName, error: error.message });
      }
    }
    
    console.log('\n📋 Step 3: Processing sections...');
    
    for (const cleaned of cleanedData) {
      console.log(`📝 Processing section: "${cleaned.section}" for grade "${cleaned.grade}" in room "${cleaned.room}"`);
      
      const gradeId = gradeMap[cleaned.grade.toLowerCase()];
      if (!gradeId) {
        const errorMsg = `Grade "${cleaned.grade}" not found in gradeMap. Available grades: ${Object.keys(gradeMap).join(', ')}`;
        console.log(`❌ ${errorMsg}`);
        results.sections.errors.push({ 
          data: cleaned, 
          error: errorMsg 
        });
        continue;
      }
      
      const roomValue = cleaned.room || 'TBD';
      const roomId = roomMap[roomValue];
      if (!roomId) {
        const errorMsg = `Room "${roomValue}" not found in roomMap. Available rooms: ${Object.keys(roomMap).join(', ')}`;
        console.log(`❌ ${errorMsg}`);
        results.sections.errors.push({ 
          data: cleaned, 
          error: errorMsg 
        });
        continue;
      }
      
      console.log(`📤 Inserting section: "${cleaned.section}" (Grade ID: ${gradeId}, Room ID: ${roomId})`);
      
      try {
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .insert({
            grade_id: gradeId,
            section_name: cleaned.section,
            room_id: roomId
          })
          .select('id, section_name, grade_id, room_id');
          
        if (sectionError) {
          if (sectionError.code === '23505') {
            console.log(`✅ Section "${cleaned.section}" already exists for grade "${cleaned.grade}", skipping...`);
            results.sections.inserted++;
          } else {
            console.log(`❌ Section insert error:`, sectionError);
            results.sections.errors.push({ 
              data: cleaned, 
              error: sectionError.message 
            });
          }
        } else if (sectionData && sectionData.length > 0) {
          console.log(`✅ Section "${cleaned.section}" inserted successfully (ID: ${sectionData[0]?.id})`);
          results.sections.inserted++;
          results.sections.details.push({ 
            grade: cleaned.grade, 
            section: cleaned.section, 
            section_id: sectionData[0]?.id,
            room: cleaned.room,
            room_id: roomId
          });
        }
      } catch (error) {
        console.log(`❌ Exception during section insert:`, error);
        results.sections.errors.push({ 
          data: cleaned, 
          error: error.message 
        });
      }
    }
    
    console.log(`\n📊 FINAL IMPORT SUMMARY:`);
    console.log(`   Grades inserted: ${results.grades.inserted}`);
    console.log(`   Rooms inserted: ${results.rooms.inserted}`);
    console.log(`   Sections inserted: ${results.sections.inserted}`);
    console.log(`   Total errors: ${results.grades.errors.length + results.rooms.errors.length + results.sections.errors.length}`);
    
    console.log(`Grade map:`, gradeMap);
    console.log(`Room map:`, roomMap);
    
    return results;
  } catch (error) {
    console.error('❌ Error in importGradesSectionsRooms:', error);
    throw error;
  }
};

const importSubjects = async (data) => {
  const results = {
    inserted: 0,
    errors: [],
    details: []
  };
  
  try {
    console.log(`🔄 Starting import of ${data.length} subject records`);
    
    for (const item of data) {
      const cleaned = cleanData(item);
      console.log(`📝 Processing subject: "${cleaned.subject_code}" - "${cleaned.subject_name}"`);
      
      const errors = validateMasterData('subjects', cleaned);
      
      if (Object.keys(errors).length > 0) {
        console.log(`❌ Validation errors:`, errors);
        results.errors.push({ data: cleaned, errors });
        continue;
      }
      
      console.log(`📤 Upserting subject: ${cleaned.subject_code}`);
      const { data: subjectData, error } = await supabase
        .from('subjects')
        .upsert({
          subject_code: cleaned.subject_code,
          subject_name: cleaned.subject_name
        }, {
          onConflict: 'subject_code'
        })
        .select();
        
      if (error) {
        console.log(`❌ Subject upsert error:`, error);
        results.errors.push({ data: cleaned, error: error.message });
      } else if (subjectData && subjectData.length > 0) {
        console.log(`✅ Subject "${cleaned.subject_code}" upserted successfully (ID: ${subjectData[0]?.id})`);
        results.inserted++;
        results.details.push({ 
          code: cleaned.subject_code, 
          name: cleaned.subject_name,
          subject_id: subjectData[0]?.id
        });
      } else {
        console.log(`⚠️ No subject data returned for "${cleaned.subject_code}"`);
      }
    }
    
    console.log(`📊 Subject Import Summary: ${results.inserted} inserted, ${results.errors.length} errors`);
    return results;
  } catch (error) {
    console.error('❌ Error in importSubjects:', error);
    throw error;
  }
};

const importGradeSchedules = async (data) => {
  const results = {
    inserted: 0,
    updated: 0,
    errors: [],
    details: []
  };
  
  try {
    console.log(`🔄 Starting import of ${data.length} grade schedule records`);
    
    for (const item of data) {
      const cleaned = cleanData(item);
      console.log(`⏰ Processing schedule for grade "${cleaned.grade}": ${cleaned.class_start} - ${cleaned.class_end} (Grace: ${cleaned.grace_period || '15'} min)`);
      
      const errors = validateMasterData('grade_schedules', cleaned);
      
      if (Object.keys(errors).length > 0) {
        console.log(`❌ Validation errors:`, errors);
        results.errors.push({ data: cleaned, errors });
        continue;
      }
      
      console.log(`🔍 Looking up grade ID for grade level: "${cleaned.grade}"`);
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('id, grade_level')
        .eq('grade_level', cleaned.grade)
        .single();
        
      if (gradeError || !gradeData) {
        const errorMsg = `Grade "${cleaned.grade}" not found in database. Please import grades first.`;
        console.log(`❌ ${errorMsg}`);
        results.errors.push({ 
          data: cleaned, 
          error: errorMsg 
        });
        continue;
      }
      
      const gradeId = gradeData.id;
      console.log(`✅ Found grade ID ${gradeId} for grade "${cleaned.grade}"`);
      
      console.log(`🔍 Checking if schedule exists for grade ID: ${gradeId}`);
      const { data: existingSchedule, error: checkError } = await supabase
        .from('grade_schedules')
        .select('id')
        .eq('grade_id', gradeId)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.log(`❌ Error checking existing schedule:`, checkError);
        results.errors.push({ 
          data: cleaned, 
          error: `Error checking existing schedule: ${checkError.message}` 
        });
        continue;
      }
      
      const gracePeriod = cleaned.grace_period ? parseInt(cleaned.grace_period) : 15;
      
      if (existingSchedule) {
        console.log(`📝 Updating existing schedule for grade ID: ${gradeId}`);
        const { data: scheduleData, error: updateError } = await supabase
          .from('grade_schedules')
          .update({
            class_start: cleaned.class_start,
            class_end: cleaned.class_end,
            grace_period_minutes: gracePeriod,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id)
          .select();
          
        if (updateError) {
          console.log(`❌ Schedule update error:`, updateError);
          results.errors.push({ 
            data: cleaned, 
            error: updateError.message 
          });
        } else {
          console.log(`✅ Schedule updated for grade "${cleaned.grade}" (ID: ${existingSchedule.id})`);
          results.updated++;
          results.details.push({ 
            grade: cleaned.grade, 
            grade_id: gradeId,
            schedule_id: existingSchedule.id,
            class_start: cleaned.class_start,
            class_end: cleaned.class_end,
            grace_period: gracePeriod,
            action: 'updated'
          });
        }
      } else {
        console.log(`📤 Inserting new schedule for grade ID: ${gradeId}`);
        const { data: scheduleData, error: insertError } = await supabase
          .from('grade_schedules')
          .insert({
            grade_id: gradeId,
            class_start: cleaned.class_start,
            class_end: cleaned.class_end,
            grace_period_minutes: gracePeriod
          })
          .select();
          
        if (insertError) {
          console.log(`❌ Schedule insert error:`, insertError);
          results.errors.push({ 
            data: cleaned, 
            error: insertError.message 
          });
        } else if (scheduleData && scheduleData.length > 0) {
          console.log(`✅ Schedule inserted for grade "${cleaned.grade}" (ID: ${scheduleData[0]?.id})`);
          results.inserted++;
          results.details.push({ 
            grade: cleaned.grade, 
            grade_id: gradeId,
            schedule_id: scheduleData[0]?.id,
            class_start: cleaned.class_start,
            class_end: cleaned.class_end,
            grace_period: gracePeriod,
            action: 'inserted'
          });
        }
      }
    }
    
    console.log(`📊 Grade Schedule Import Summary: ${results.inserted} inserted, ${results.updated} updated, ${results.errors.length} errors`);
    return results;
  } catch (error) {
    console.error('❌ Error in importGradeSchedules:', error);
    throw error;
  }
};

router.post('/upload', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or invalid file type'
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📁 STARTING MASTER DATA UPLOAD');
    console.log('='.repeat(60));
    console.log(`File: ${req.file.originalname}`);
    console.log(`Size: ${req.file.size} bytes`);
    console.log(`Type: ${req.file.mimetype}`);

    let processedData;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      console.log('\n📄 Processing as Excel file...');
      processedData = await processMasterDataExcel(req.file.buffer);
    } else if (fileExtension === '.csv') {
      console.log('\n📄 Processing as CSV file...');
      processedData = await processMasterDataCSV(req.file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Please upload .xlsx, .xls, or .csv files'
      });
    }

    console.log(`\n📊 Detected data type: ${processedData.type}`);
    console.log('Starting database import...');

    let importResults = {};
    let responseData = {
      success: true,
      type: processedData.type,
      summary: {},
      message: '',
      warnings: [],
      errors: {}
    };

    const dataTypes = [];
    if (processedData.grades_sections_rooms && processedData.grades_sections_rooms.length > 0) {
      dataTypes.push('grades_sections_rooms');
    }
    if (processedData.subjects && processedData.subjects.length > 0) {
      dataTypes.push('subjects');
    }
    if (processedData.grade_schedules && processedData.grade_schedules.length > 0) {
      dataTypes.push('grade_schedules');
    }

    for (const dataType of dataTypes) {
      if (dataType === 'grades_sections_rooms') {
        console.log('\n' + '='.repeat(60));
        console.log('📚 IMPORTING GRADES, SECTIONS & ROOMS');
        console.log('='.repeat(60));
        
        const results = await importGradesSectionsRooms(processedData.grades_sections_rooms);
        importResults.grades_sections_rooms = results;
        
        responseData.summary.grades = results.grades.inserted;
        responseData.summary.rooms = results.rooms.inserted;
        responseData.summary.sections = results.sections.inserted;
        responseData.summary.totalGradesSectionsRoomsRecords = processedData.grades_sections_rooms.length;
        
        if (results.sections.errors.length > 0) {
          responseData.errors.sections = results.sections.errors.slice(0, 5);
        }
        if (results.rooms.errors.length > 0) {
          responseData.errors.rooms = results.rooms.errors.slice(0, 5);
        }
        
      } else if (dataType === 'subjects') {
        console.log('\n' + '='.repeat(60));
        console.log('📚 IMPORTING SUBJECTS');
        console.log('='.repeat(60));
        
        const results = await importSubjects(processedData.subjects);
        importResults.subjects = results;
        
        responseData.summary.subjects = results.inserted;
        responseData.summary.totalSubjectsRecords = processedData.subjects.length;
        
      } else if (dataType === 'grade_schedules') {
        console.log('\n' + '='.repeat(60));
        console.log('⏰ IMPORTING GRADE SCHEDULES');
        console.log('='.repeat(60));
        
        const results = await importGradeSchedules(processedData.grade_schedules);
        importResults.grade_schedules = results;
        
        responseData.summary.gradeSchedules = results.inserted + results.updated;
        responseData.summary.gradeSchedulesInserted = results.inserted;
        responseData.summary.gradeSchedulesUpdated = results.updated;
        responseData.summary.totalGradeSchedulesRecords = processedData.grade_schedules.length;
        
        if (results.errors.length > 0) {
          responseData.errors.grade_schedules = results.errors.slice(0, 5);
        }
        
        const gradeErrors = results.errors.filter(err => 
          err.error && err.error.includes('not found in database')
        );
        if (gradeErrors.length > 0) {
          responseData.warnings.push('Some grade schedules could not be imported because grades were not found. Import grades first.');
        }
      }
    }

    const messages = [];
    if (responseData.summary.sections) {
      messages.push(`${responseData.summary.sections} sections`);
    }
    if (responseData.summary.grades) {
      messages.push(`${responseData.summary.grades} grades`);
    }
    if (responseData.summary.rooms) {
      messages.push(`${responseData.summary.rooms} rooms`);
    }
    if (responseData.summary.subjects) {
      messages.push(`${responseData.summary.subjects} subjects`);
    }
    if (responseData.summary.gradeSchedules) {
      messages.push(`${responseData.summary.gradeSchedules} grade schedules`);
    }
    
    responseData.message = `Imported ${messages.join(', ')}`;

    const totalErrors = 
      (responseData.summary.totalGradesSectionsRoomsRecords || 0) -
      ((responseData.summary.sections || 0) + (responseData.summary.grades || 0) + (responseData.summary.rooms || 0)) / 3 +
      (responseData.summary.totalSubjectsRecords || 0) - (responseData.summary.subjects || 0) +
      (responseData.summary.totalGradeSchedulesRecords || 0) - (responseData.summary.gradeSchedules || 0);
    
    if (totalErrors > 0) {
      responseData.warnings.push(`${Math.round(totalErrors)} records had errors and were skipped`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ UPLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log(`Message: ${responseData.message}`);
    console.log(`Summary:`, JSON.stringify(responseData.summary, null, 2));
    
    if (responseData.warnings && responseData.warnings.length > 0) {
      console.log(`Warnings:`, responseData.warnings);
    }
    
    if (responseData.errors && Object.keys(responseData.errors).length > 0) {
      console.log(`Errors:`, JSON.stringify(responseData.errors, null, 2));
    }
    
    console.log('='.repeat(60) + '\n');

    res.json(responseData);

  } catch (error) {
    console.error('\n❌ MASTER DATA UPLOAD ERROR:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      error: `Upload failed: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Master Data Upload API',
    timestamp: new Date().toISOString()
  });
});

router.get('/template', (req, res) => {
  const templatePath = path.join(process.cwd(), 'templates', 'master-data-template.xlsx');
  
  res.download(templatePath, 'master-data-template.xlsx', (err) => {
    if (err) {
      console.error('Error downloading template:', err);
      res.status(500).json({
        success: false,
        error: 'Template file not found'
      });
    }
  });
});

export default router;