import { supabase } from "../lib/supabase"; 

// Base entity service
export class EntityService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async fetchByField(field, value) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq(field, value);
    
    if (error) throw error;
    return data || [];
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }
}

// Student-specific service (extends EntityService)
export class StudentService extends EntityService {
  constructor() {
    super('students');
  }

  // ADD THIS METHOD - for fetching all students
  async fetchAllStudents() {
    return this.fetchAll();
  }

  async fetchByGrade(grade) {
    return this.fetchByField('grade', grade);
  }

  async generateTokenForStudent(id) {
    const token = crypto.randomUUID();
    return this.update(id, { qr_verification_token: token });
  }
}

// Guardian data extraction from students table
export class GuardianService {
  static async fetchAll() {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        section,
        guardian_first_name,
        guardian_middle_name,
        guardian_last_name,
        guardian_phone_number,
        guardian_email
      `);
    
    if (error) throw error;
    
    // Transform to guardian format
    return data.map(student => ({
      id: student.id,
      // Guardian info
      first_name: student.guardian_first_name,
      middle_name: student.guardian_middle_name,
      last_name: student.guardian_last_name,
      phone_number: student.guardian_phone_number,
      email: student.guardian_email,
      // Student they're guardian of
      student_id: student.id,
      guardian_of: `${student.first_name} ${student.last_name}`,
      grade: student.grade,
      section: student.section
    }));
  }

  static async fetchByGrade(grade) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        section,
        guardian_first_name,
        guardian_middle_name,
        guardian_last_name,
        guardian_phone_number,
        guardian_email
      `)
      .eq('grade', grade);
    
    if (error) throw error;
    
    return data.map(student => ({
      id: student.id,
      first_name: student.guardian_first_name,
      middle_name: student.guardian_middle_name,
      last_name: student.guardian_last_name,
      phone_number: student.guardian_phone_number,
      email: student.guardian_email,
      student_id: student.id,
      guardian_of: `${student.first_name} ${student.last_name}`,
      grade: student.grade,
      section: student.section
    }));
  }

  static async update(studentId, guardianData) {
    const updates = {
      guardian_first_name: guardianData.first_name,
      guardian_middle_name: guardianData.middle_name,
      guardian_last_name: guardianData.last_name,
      guardian_phone_number: guardianData.phone_number,
      guardian_email: guardianData.email
    };
    
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Return in guardian format
    return {
      id: data.id,
      first_name: data.guardian_first_name,
      middle_name: data.guardian_middle_name,
      last_name: data.guardian_last_name,
      phone_number: data.guardian_phone_number,
      email: data.guardian_email,
      student_id: data.id,
      guardian_of: `${data.first_name} ${data.last_name}`,
      grade: data.grade,
      section: data.section
    };
  }
}