import { useState } from 'react';
import { validateStudentData } from '../../Utils/StudentDataValidation'; 

export const useEntityEdit = (entities, setEntities, entityType = 'student', refreshAll = null) => {
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const startEdit = (entity) => {
    setEditingId(entity.id);
    setValidationErrors({});
    
    if (entityType === 'student') {
      setEditFormData({
        lrn: entity.lrn,
        first_name: entity.first_name,
        middle_name: entity.middle_name,
        last_name: entity.last_name,
        grade: entity.grade,
        section: entity.section,
        email: entity.email,
        phone_number: entity.phone_number,
        // Guardian fields
        guardian_first_name: entity.guardian_first_name || '',
        guardian_middle_name: entity.guardian_middle_name || '',
        guardian_last_name: entity.guardian_last_name || '',
        guardian_phone_number: entity.guardian_phone_number || '',
        guardian_email: entity.guardian_email || ''
      });
    } else if (entityType === 'guardian') {
      // For guardian editing (when editing from guardian table)
      setEditFormData({
        first_name: entity.first_name,
        middle_name: entity.middle_name,
        last_name: entity.last_name,
        phone_number: entity.phone_number,
        email: entity.email
      });
    } else if (entityType === 'teacher') {
      // ADD THIS SECTION FOR TEACHERS
      setEditFormData({
        employee_id: entity.employee_id,
        first_name: entity.first_name,
        middle_name: entity.middle_name || '',
        last_name: entity.last_name,
        phone_no: entity.phone_no || '',
        email_address: entity.email_address || ''
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setValidationErrors({});
  };

  const updateEditField = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for this field when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    let errors = {};
    
    if (entityType === 'student') {
      // Validate student fields including guardian fields
      errors = validateStudentData(editFormData);
    } else if (entityType === 'guardian') {
      // For guardian editing, create a simpler validation
      // Only validate guardian-specific fields
      if (!editFormData.first_name?.trim()) {
        errors.first_name = 'First name is required';
      }
      if (!editFormData.last_name?.trim()) {
        errors.last_name = 'Last name is required';
      }
      if (editFormData.email && !/\S+@\S+\.\S+/.test(editFormData.email)) {
        errors.email = 'Email is invalid';
      }
      if (editFormData.phone_number && !/^[\+]?[1-9][\d]{0,15}$/.test(editFormData.phone_number.replace(/\D/g, ''))) {
        errors.phone_number = 'Phone number is invalid';
      }
    } else if (entityType === 'teacher') {
      // ADD TEACHER VALIDATION
      if (!editFormData.employee_id?.trim()) {
        errors.employee_id = 'Employee ID is required';
      }
      if (!editFormData.first_name?.trim()) {
        errors.first_name = 'First name is required';
      }
      if (!editFormData.last_name?.trim()) {
        errors.last_name = 'Last name is required';
      }
      if (editFormData.email_address && !/\S+@\S+\.\S+/.test(editFormData.email_address)) {
        errors.email_address = 'Email is invalid';
      }
      if (editFormData.phone_no && !/^[\+]?[1-9][\d]{0,15}$/.test(editFormData.phone_no.replace(/\D/g, ''))) {
        errors.phone_no = 'Phone number is invalid';
      }
    }
    
    setValidationErrors(errors);
    return errors;
  };

  const saveEdit = async (entityId, currentClass, updateService) => {
    try {
      setSaving(true);
      
      // Validate the form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        throw new Error('Please fix the validation errors');
      }
      
      const updatedEntity = await updateService(entityId, editFormData);
      
      // Update local state
      setEntities(prevEntities => {
        if (entityType === 'student') {
          const entity = prevEntities.find(e => e.id === entityId);
          const gradeChanged = entity && entity.grade !== updatedEntity.grade;
          
          if (gradeChanged && updatedEntity.grade !== currentClass) {
            return prevEntities.filter(e => e.id !== entityId);
          } else {
            return prevEntities.map(entity => 
              entity.id === entityId ? updatedEntity : entity
            );
          }
        } else {
          // For teachers, guardians or other entities
          return prevEntities.map(entity => 
            entity.id === entityId ? updatedEntity : entity
          );
        }
      });

      // Refresh all data if needed
      if (refreshAll) {
        await refreshAll();
      }

      cancelEdit();
      
      return { 
        success: true, 
        gradeChanged: entityType === 'student' ? updatedEntity.grade !== currentClass : false 
      };
      
    } catch (err) {
      console.error(`Error updating ${entityType}:`, err);
      return { 
        success: false, 
        error: err.message,
        validationErrors: validationErrors
      };
    } finally {
      setSaving(false);
    }
  };

  return {
    editingId,
    editFormData,
    saving,
    validationErrors,
    startEdit,
    cancelEdit,
    updateEditField,
    validateForm,
    saveEdit,
    entityType
  };
};