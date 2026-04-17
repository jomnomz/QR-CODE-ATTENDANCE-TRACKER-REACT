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
  
  if (type === 'grades_sections') {
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
      grades_sections: [],
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
      
      const hasSubjectCode = getValue(headers, [
        'Subject Code', 'Code', 'Subject_Code', 'subject code'
      ]) !== '';
      
      const hasSubjectName = getValue(headers, [
        'Subject Name', 'Subject', 'Subjects', 'Subject_Name', 'subject name'
      ]) !== '';

      console.log(`📋 Sheet "${sheet.name}" analysis:`);
      console.log(`   Has Grade: ${hasGrade}`);
      console.log(`   Has Section: ${hasSection}`);
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
        console.log(`📊 Processing Grades & Sections from sheet: "${sheet.name}"`);
        
        let count = 0;
        dataRows.forEach((row, index) => {
          const grade = getValue(row, ['Grade Level', 'Grade', 'Grade_Level', 'grade level', 'Level', 'Class']);
          const section = getValue(row, ['Section Name', 'Section', 'Section_Name', 'section name', 'Class']);
          
          if (grade && section) {
            allData.grades_sections.push({
              grade: grade,
              section: section
            });
            count++;
            console.log(`   Row ${index + 1}: Grade="${grade}", Section="${section}"`);
          } else if (grade || section) {
            console.log(`   ⚠️ Row ${index + 1}: Incomplete data - Grade="${grade}", Section="${section}"`);
          }
        });
        
        console.log(`✅ Extracted ${count} grade/section records from "${sheet.name}"`);
        
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
    console.log(`   Grades/Sections: ${allData.grades_sections.length} records`);
    console.log(`   Subjects: ${allData.subjects.length} records`);
    console.log(`   Grade Schedules: ${allData.grade_schedules.length} records`);

    if (allData.grades_sections.length > 0) {
      console.log('\n📝 Sample Grades/Sections data (first 3):');
      allData.grades_sections.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. Grade: "${item.grade}", Section: "${item.section}"`);
      });
    }

    if (allData.grade_schedules.length > 0) {
      console.log('\n⏰ Sample Grade Schedules data (first 3):');
      allData.grade_schedules.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. Grade: "${item.grade}", Start: "${item.class_start}", End: "${item.class_end}", Grace: "${item.grace_period}"`);
      });
    }

    const hasGradesSections = allData.grades_sections.length > 0;
    const hasSubjects = allData.subjects.length > 0;
    const hasGradeSchedules = allData.grade_schedules.length > 0;

    const dataTypes = [];
    if (hasGradesSections) dataTypes.push('grades_sections');
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
    const gradesSections = [];
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
          gradesSections.push({
            grade: grade,
            section: getCsvValue(data, csvHeaders.section)
          });
        } else if (subjectCode) {
          subjects.push({
            subject_code: subjectCode,
            subject_name: getCsvValue(data, csvHeaders.subject_name)
          });
        }
      })
      .on('end', () => {
        console.log(`CSV Summary: Grades/Sections: ${gradesSections.length}, Subjects: ${subjects.length}, Grade Schedules: ${gradeSchedules.length}`);
        
        const data = {
          grades_sections: gradesSections,
          subjects: subjects,
          grade_schedules: gradeSchedules
        };
        
        const dataTypes = [];
        if (gradesSections.length > 0) dataTypes.push('grades_sections');
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

const importGradesSections = async (data) => {
  const results = {
    grades: { inserted: 0, skipped: 0, errors: [], details: [] },
    sections: { inserted: 0, skipped: 0, errors: [], details: [] }
  };
  
  try {
    console.log(`🔄 Starting import of ${data.length} grade/section records`);
    
    console.log('First 3 rows of raw data:', data.slice(0, 3));
    
    const cleanedData = data.map(item => {
      const cleaned = cleanData(item);
      console.log(`Cleaned: ${item.grade} -> "${cleaned.grade}", Section: "${cleaned.section}"`);
      return cleaned;
    });
    
    const uniqueGrades = [...new Set(cleanedData.map(item => item.grade))];
    
    console.log(`📚 Unique grades after cleaning:`, uniqueGrades);

    console.log('\n🔍 Step 1: Checking existing grades...');
    const { data: existingGrades, error: existingGradesError } = await supabase
      .from('grades')
      .select('id, grade_level')
      .in('grade_level', uniqueGrades);
    
    if (existingGradesError) {
      console.error('❌ Error checking existing grades:', existingGradesError);
      results.grades.errors.push({ error: existingGradesError.message });
    }
    
    const existingGradeMap = {};
    const newGrades = [];
    
    existingGrades?.forEach(grade => {
      existingGradeMap[grade.grade_level] = grade.id;
    });
    
    uniqueGrades.forEach(gradeName => {
      if (!existingGradeMap[gradeName]) {
        newGrades.push(gradeName);
      }
    });
    
    console.log(`📊 Found ${existingGrades?.length || 0} existing grades, ${newGrades.length} new grades`);

    console.log('\n📚 Step 2: Processing new grades...');
    const gradeMap = { ...existingGradeMap };
    
    if (newGrades.length > 0) {
      console.log(`📤 Inserting ${newGrades.length} new grades...`);
      const { data: insertedGrades, error: insertError } = await supabase
        .from('grades')
        .insert(newGrades.map(gradeName => ({ grade_level: gradeName })))
        .select('id, grade_level');
        
      if (insertError) {
        console.error('❌ Error inserting new grades:', insertError);
        results.grades.errors.push({ error: insertError.message });
      } else {
        insertedGrades?.forEach(grade => {
          gradeMap[grade.grade_level] = grade.id;
          results.grades.inserted++;
          results.grades.details.push({ grade: grade.grade_level, grade_id: grade.id });
        });
      }
    }
    
    results.grades.skipped = existingGrades?.length || 0;
    console.log(`✅ Grades: ${results.grades.inserted} inserted, ${results.grades.skipped} skipped`);

    console.log('\n🔍 Step 3: Checking existing sections...');
    const uniqueSections = [];
    const gradeSectionMap = {};
    
    cleanedData.forEach(item => {
      const gradeId = gradeMap[item.grade];
      if (gradeId && item.section) {
        const key = `${gradeId}_${item.section}`;
        if (!gradeSectionMap[key]) {
          gradeSectionMap[key] = true;
          uniqueSections.push({
            grade_id: gradeId,
            section: item.section
          });
        }
      }
    });
    
    console.log(`📊 Processing ${uniqueSections.length} unique grade/section combinations`);
    
    let existingSectionsCount = 0;
    const newSectionsToInsert = [];
    
    for (const section of uniqueSections) {
      const { data: existingSection, error: checkError } = await supabase
        .from('sections')
        .select('id')
        .eq('grade_id', section.grade_id)
        .eq('section_name', section.section)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking section "${section.section}":`, checkError);
        results.sections.errors.push({ 
          grade_id: section.grade_id, 
          section: section.section, 
          error: checkError.message 
        });
      } else if (existingSection) {
        existingSectionsCount++;
      } else {
        newSectionsToInsert.push(section);
      }
    }
    
    console.log(`📊 Found ${existingSectionsCount} existing sections, ${newSectionsToInsert.length} new sections`);

    console.log('\n📋 Step 4: Processing new sections...');
    
    if (newSectionsToInsert.length > 0) {
      console.log(`📤 Inserting ${newSectionsToInsert.length} new sections...`);
      const { data: insertedSections, error: insertError } = await supabase
        .from('sections')
        .insert(newSectionsToInsert.map(s => ({
          grade_id: s.grade_id,
          section_name: s.section
        })))
        .select('id, grade_id, section_name');
        
      if (insertError) {
        console.error('❌ Error inserting new sections:', insertError);
        results.sections.errors.push({ error: insertError.message });
      } else {
        insertedSections?.forEach(section => {
          results.sections.inserted++;
          results.sections.details.push({ 
            section_id: section.id,
            grade_id: section.grade_id,
            section_name: section.section_name
          });
        });
      }
    }
    
    results.sections.skipped = existingSectionsCount;
    
    console.log(`\n📊 FINAL IMPORT SUMMARY:`);
    console.log(`   Grades: ${results.grades.inserted} inserted, ${results.grades.skipped} skipped`);
    console.log(`   Sections: ${results.sections.inserted} inserted, ${results.sections.skipped} skipped`);
    console.log(`   Total errors: ${results.grades.errors.length + results.sections.errors.length}`);
    
    return results;
  } catch (error) {
    console.error('❌ Error in importGradesSections:', error);
    throw error;
  }
};

const importSubjects = async (data) => {
  const results = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  
  try {
    console.log(`🔄 Starting import of ${data.length} subject records`);
    
    const uniqueSubjects = [];
    const subjectMap = {};
    
    data.forEach(item => {
      const cleaned = cleanData(item);
      const key = cleaned.subject_code?.toLowerCase();
      if (key && !subjectMap[key]) {
        subjectMap[key] = true;
        uniqueSubjects.push(cleaned);
      }
    });
    
    console.log(`📊 Processing ${uniqueSubjects.length} unique subjects`);
    
    for (const item of uniqueSubjects) {
      console.log(`📝 Processing subject: "${item.subject_code}" - "${item.subject_name}"`);
      
      const errors = validateMasterData('subjects', item);
      
      if (Object.keys(errors).length > 0) {
        console.log(`❌ Validation errors:`, errors);
        results.errors.push({ data: item, errors });
        continue;
      }
      
      console.log(`🔍 Checking if subject "${item.subject_code}" exists...`);
      const { data: existingSubject, error: checkError } = await supabase
        .from('subjects')
        .select('subject_code, subject_name')
        .eq('subject_code', item.subject_code)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.log(`❌ Error checking subject:`, checkError);
        results.errors.push({ data: item, error: checkError.message });
        continue;
      }
      
      if (existingSubject) {
        if (existingSubject.subject_name === item.subject_name) {
          console.log(`✅ Subject "${item.subject_code}" already exists with same name, skipping...`);
          results.skipped++;
          results.details.push({ 
            code: item.subject_code, 
            name: item.subject_name,
            action: 'skipped',
            reason: 'Already exists'
          });
        } else {
          console.log(`📝 Subject "${item.subject_code}" exists but name differs, updating...`);
          const { data: updatedSubject, error: updateError } = await supabase
            .from('subjects')
            .update({ 
              subject_name: item.subject_name,
              updated_at: new Date().toISOString()
            })
            .eq('subject_code', item.subject_code)
            .select();
            
          if (updateError) {
            console.log(`❌ Subject update error:`, updateError);
            results.errors.push({ data: item, error: updateError.message });
          } else {
            console.log(`✅ Subject "${item.subject_code}" updated successfully`);
            results.updated++;
            results.details.push({ 
              code: item.subject_code, 
              name: item.subject_name,
              subject_id: updatedSubject?.[0]?.id,
              action: 'updated'
            });
          }
        }
      } else {
        console.log(`📤 Inserting new subject: ${item.subject_code}`);
        const { data: subjectData, error } = await supabase
          .from('subjects')
          .insert({
            subject_code: item.subject_code,
            subject_name: item.subject_name
          })
          .select();
          
        if (error) {
          console.log(`❌ Subject insert error:`, error);
          results.errors.push({ data: item, error: error.message });
        } else if (subjectData && subjectData.length > 0) {
          console.log(`✅ Subject "${item.subject_code}" inserted successfully (ID: ${subjectData[0]?.id})`);
          results.inserted++;
          results.details.push({ 
            code: item.subject_code, 
            name: item.subject_name,
            subject_id: subjectData[0]?.id,
            action: 'inserted'
          });
        }
      }
    }
    
    console.log(`📊 Subject Import Summary: ${results.inserted} inserted, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`);
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
    skipped: 0,
    errors: [],
    details: []
  };
  
  try {
    console.log(`🔄 Starting import of ${data.length} grade schedule records`);
    
    const uniqueSchedules = [];
    const scheduleMap = {};
    
    data.forEach(item => {
      const cleaned = cleanData(item);
      const key = cleaned.grade;
      if (key && !scheduleMap[key]) {
        scheduleMap[key] = true;
        uniqueSchedules.push(cleaned);
      }
    });
    
    console.log(`📊 Processing ${uniqueSchedules.length} unique grade schedules`);
    
    for (const item of uniqueSchedules) {
      console.log(`⏰ Processing schedule for grade "${item.grade}": ${item.class_start} - ${item.class_end} (Grace: ${item.grace_period || '15'} min)`);
      
      const errors = validateMasterData('grade_schedules', item);
      
      if (Object.keys(errors).length > 0) {
        console.log(`❌ Validation errors:`, errors);
        results.errors.push({ data: item, errors });
        continue;
      }
      
      console.log(`🔍 Looking up grade ID for grade level: "${item.grade}"`);
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('id, grade_level')
        .eq('grade_level', item.grade)
        .single();
        
      if (gradeError || !gradeData) {
        const errorMsg = `Grade "${item.grade}" not found in database. Please import grades first.`;
        console.log(`❌ ${errorMsg}`);
        results.errors.push({ 
          data: item, 
          error: errorMsg 
        });
        continue;
      }
      
      const gradeId = gradeData.id;
      console.log(`✅ Found grade ID ${gradeId} for grade "${item.grade}"`);
      
      console.log(`🔍 Checking if schedule exists for grade ID: ${gradeId}`);
      const { data: existingSchedule, error: checkError } = await supabase
        .from('grade_schedules')
        .select('id, class_start, class_end, grace_period_minutes')
        .eq('grade_id', gradeId)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.log(`❌ Error checking existing schedule:`, checkError);
        results.errors.push({ 
          data: item, 
          error: `Error checking existing schedule: ${checkError.message}` 
        });
        continue;
      }
      
      const gracePeriod = item.grace_period ? parseInt(item.grace_period) : 15;
      
      const isSameSchedule = existingSchedule && 
        existingSchedule.class_start === item.class_start && 
        existingSchedule.class_end === item.class_end && 
        existingSchedule.grace_period_minutes === gracePeriod;
      
      if (existingSchedule) {
        if (isSameSchedule) {
          console.log(`✅ Schedule for grade "${item.grade}" already exists with same data, skipping...`);
          results.skipped++;
          results.details.push({ 
            grade: item.grade, 
            grade_id: gradeId,
            schedule_id: existingSchedule.id,
            class_start: item.class_start,
            class_end: item.class_end,
            grace_period: gracePeriod,
            action: 'skipped',
            reason: 'Already exists'
          });
        } else {
          console.log(`📝 Updating existing schedule for grade ID: ${gradeId}`);
          const { data: scheduleData, error: updateError } = await supabase
            .from('grade_schedules')
            .update({
              class_start: item.class_start,
              class_end: item.class_end,
              grace_period_minutes: gracePeriod,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSchedule.id)
            .select();
            
          if (updateError) {
            console.log(`❌ Schedule update error:`, updateError);
            results.errors.push({ 
              data: item, 
              error: updateError.message 
            });
          } else {
            console.log(`✅ Schedule updated for grade "${item.grade}" (ID: ${existingSchedule.id})`);
            results.updated++;
            results.details.push({ 
              grade: item.grade, 
              grade_id: gradeId,
              schedule_id: existingSchedule.id,
              class_start: item.class_start,
              class_end: item.class_end,
              grace_period: gracePeriod,
              action: 'updated'
            });
          }
        }
      } else {
        console.log(`📤 Inserting new schedule for grade ID: ${gradeId}`);
        const { data: scheduleData, error: insertError } = await supabase
          .from('grade_schedules')
          .insert({
            grade_id: gradeId,
            class_start: item.class_start,
            class_end: item.class_end,
            grace_period_minutes: gracePeriod
          })
          .select();
          
        if (insertError) {
          console.log(`❌ Schedule insert error:`, insertError);
          results.errors.push({ 
            data: item, 
            error: insertError.message 
          });
        } else if (scheduleData && scheduleData.length > 0) {
          console.log(`✅ Schedule inserted for grade "${item.grade}" (ID: ${scheduleData[0]?.id})`);
          results.inserted++;
          results.details.push({ 
            grade: item.grade, 
            grade_id: gradeId,
            schedule_id: scheduleData[0]?.id,
            class_start: item.class_start,
            class_end: item.class_end,
            grace_period: gracePeriod,
            action: 'inserted'
          });
        }
      }
    }
    
    console.log(`📊 Grade Schedule Import Summary: ${results.inserted} inserted, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`);
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
    if (processedData.grades_sections && processedData.grades_sections.length > 0) {
      dataTypes.push('grades_sections');
    }
    if (processedData.subjects && processedData.subjects.length > 0) {
      dataTypes.push('subjects');
    }
    if (processedData.grade_schedules && processedData.grade_schedules.length > 0) {
      dataTypes.push('grade_schedules');
    }

    for (const dataType of dataTypes) {
      if (dataType === 'grades_sections') {
        console.log('\n' + '='.repeat(60));
        console.log('📚 IMPORTING GRADES & SECTIONS');
        console.log('='.repeat(60));
        
        const results = await importGradesSections(processedData.grades_sections);
        importResults.grades_sections = results;
        
        responseData.summary.gradesInserted = results.grades.inserted;
        responseData.summary.gradesSkipped = results.grades.skipped;
        responseData.summary.sectionsInserted = results.sections.inserted;
        responseData.summary.sectionsSkipped = results.sections.skipped;
        responseData.summary.totalGradesSectionsRecords = processedData.grades_sections.length;
        
        if (results.grades.errors.length > 0) {
          responseData.errors.grades = results.grades.errors.slice(0, 5);
        }
        if (results.sections.errors.length > 0) {
          responseData.errors.sections = results.sections.errors.slice(0, 5);
        }
        
      } else if (dataType === 'subjects') {
        console.log('\n' + '='.repeat(60));
        console.log('📚 IMPORTING SUBJECTS');
        console.log('='.repeat(60));
        
        const results = await importSubjects(processedData.subjects);
        importResults.subjects = results;
        
        responseData.summary.subjectsInserted = results.inserted;
        responseData.summary.subjectsUpdated = results.updated;
        responseData.summary.subjectsSkipped = results.skipped;
        responseData.summary.totalSubjectsRecords = processedData.subjects.length;
        
        if (results.errors.length > 0) {
          responseData.errors.subjects = results.errors.slice(0, 5);
        }
        
      } else if (dataType === 'grade_schedules') {
        console.log('\n' + '='.repeat(60));
        console.log('⏰ IMPORTING GRADE SCHEDULES');
        console.log('='.repeat(60));
        
        const results = await importGradeSchedules(processedData.grade_schedules);
        importResults.grade_schedules = results;
        
        responseData.summary.gradeSchedulesInserted = results.inserted;
        responseData.summary.gradeSchedulesUpdated = results.updated;
        responseData.summary.gradeSchedulesSkipped = results.skipped;
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
    if (responseData.summary.gradesInserted > 0) {
      messages.push(`${responseData.summary.gradesInserted} new grades`);
    }
    if (responseData.summary.gradesSkipped > 0) {
      messages.push(`${responseData.summary.gradesSkipped} grades skipped (already exist)`);
    }
    if (responseData.summary.sectionsInserted > 0) {
      messages.push(`${responseData.summary.sectionsInserted} new sections`);
    }
    if (responseData.summary.sectionsSkipped > 0) {
      messages.push(`${responseData.summary.sectionsSkipped} sections skipped (already exist)`);
    }
    if (responseData.summary.subjectsInserted > 0) {
      messages.push(`${responseData.summary.subjectsInserted} new subjects`);
    }
    if (responseData.summary.subjectsUpdated > 0) {
      messages.push(`${responseData.summary.subjectsUpdated} subjects updated`);
    }
    if (responseData.summary.subjectsSkipped > 0) {
      messages.push(`${responseData.summary.subjectsSkipped} subjects skipped (already exist)`);
    }
    if (responseData.summary.gradeSchedulesInserted > 0) {
      messages.push(`${responseData.summary.gradeSchedulesInserted} new grade schedules`);
    }
    if (responseData.summary.gradeSchedulesUpdated > 0) {
      messages.push(`${responseData.summary.gradeSchedulesUpdated} grade schedules updated`);
    }
    if (responseData.summary.gradeSchedulesSkipped > 0) {
      messages.push(`${responseData.summary.gradeSchedulesSkipped} grade schedules skipped (already exist)`);
    }
    
    if (messages.length > 0) {
      responseData.message = `Import completed: ${messages.join(', ')}`;
    } else {
      responseData.message = 'No new data to import. All records already exist in the system.';
    }

    const totalErrors = 
      (responseData.summary.totalGradesSectionsRecords || 0) -
      ((responseData.summary.gradesInserted || 0) + (responseData.summary.gradesSkipped || 0)) +
      (responseData.summary.totalSubjectsRecords || 0) - 
      ((responseData.summary.subjectsInserted || 0) + (responseData.summary.subjectsUpdated || 0) + (responseData.summary.subjectsSkipped || 0)) +
      (responseData.summary.totalGradeSchedulesRecords || 0) - 
      ((responseData.summary.gradeSchedulesInserted || 0) + (responseData.summary.gradeSchedulesUpdated || 0) + (responseData.summary.gradeSchedulesSkipped || 0));
    
    if (totalErrors > 0) {
      responseData.warnings.push(`${Math.round(totalErrors)} records had errors and were not processed`);
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