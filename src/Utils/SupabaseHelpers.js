import { supabase } from "../lib/supabase";

export const StudentService = {
  fetchByGrade: async (grade) => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('grade', grade)
      .order('last_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  updateStudent: async (studentId, updateData) => {

    const cleanedData = { ...updateData };
    if (cleanedData.email === '') cleanedData.email = null;
    if (cleanedData.phone_number === '') cleanedData.phone_number = null;

    const { data, error } = await supabase
      .from('students')
      .update(cleanedData)
      .eq('id', studentId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  deleteStudent: async (studentId) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    
    if (error) throw error;
  }
};