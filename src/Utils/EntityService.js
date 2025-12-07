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

  async create(data) {
    const { data: newData, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return newData;
  }
}

// Student-specific service
export class StudentService extends EntityService {
  constructor() {
    super('students');
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        created_by_user:users!students_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!students_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `);
    
    if (error) throw error;
    return data || [];
  }

  async fetchByGrade(grade) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        created_by_user:users!students_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!students_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .eq('grade', grade);
    
    if (error) throw error;
    return data || [];
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!students_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!students_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async generateTokenForStudent(id) {
    const token = crypto.randomUUID();
    return this.update(id, { qr_verification_token: token });
  }
}

// Teacher-specific service
export class TeacherService extends EntityService {
  constructor() {
    super('teachers');
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        created_by_user:users!teachers_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!teachers_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `);
    
    if (error) throw error;
    return data || [];
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!teachers_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!teachers_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Guardian service
export class GuardianService extends EntityService {
  constructor() {
    super('students'); // Still uses students table but transforms data
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
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
    
    return this.transformToGuardianFormat(data);
  }

  async fetchByGrade(grade) {
    const { data, error } = await supabase
      .from(this.tableName)
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
    
    return this.transformToGuardianFormat(data);
  }

  async updateGuardian(studentId, guardianData) {
    const updates = {
      guardian_first_name: guardianData.first_name,
      guardian_middle_name: guardianData.middle_name,
      guardian_last_name: guardianData.last_name,
      guardian_phone_number: guardianData.phone_number,
      guardian_email: guardianData.email
    };
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.transformToGuardianFormat([data])[0];
  }

  transformToGuardianFormat(students) {
    return students.map(student => ({
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
}