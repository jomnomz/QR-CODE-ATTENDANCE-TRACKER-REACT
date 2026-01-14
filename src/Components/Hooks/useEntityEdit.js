import { useState } from 'react';
import { validateStudentData } from '../../Utils/StudentDataValidation'; 
import { validateTeacherData } from '../../Utils/TeacherValidation';
import { validateGradeSectionData, validateSubjectData  } from '../../Utils/MasterDataValidation'; 

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
        guardian_first_name: entity.guardian_first_name || '',
        guardian_middle_name: entity.guardian_middle_name || '',
        guardian_last_name: entity.guardian_last_name || '',
        guardian_phone_number: entity.guardian_phone_number || '',
        guardian_email: entity.guardian_email || ''
      });
    } else if (entityType === 'guardian') {
      setEditFormData({
        first_name: entity.first_name,
        middle_name: entity.middle_name,
        last_name: entity.last_name,
        phone_number: entity.phone_number,
        email: entity.email
      });
    } else if (entityType === 'teacher') {
      setEditFormData({
        employee_id: entity.employee_id,
        first_name: entity.first_name,
        middle_name: entity.middle_name || '',
        last_name: entity.last_name,
        phone_no: entity.phone_no || '',
        email_address: entity.email_address || ''
      });
    } else if (entityType === 'gradeSection') {
      setEditFormData({
        grade: entity.grade,
        section: entity.section,
        room: entity.room
      });
    } else if (entityType === 'subject') {
      setEditFormData({
        subject_code: entity.subject_code,
        subject_name: entity.subject_name
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
      errors = validateStudentData(editFormData);
    } else if (entityType === 'guardian') {
      if (!editFormData.first_name?.trim()) errors.first_name = 'First name is required';
      if (!editFormData.last_name?.trim()) errors.last_name = 'Last name is required';
      if (editFormData.email && !/\S+@\S+\.\S+/.test(editFormData.email)) errors.email = 'Email is invalid';
      if (editFormData.phone_number && !/^[\+]?[1-9][\d]{0,15}$/.test(editFormData.phone_number.replace(/\D/g, ''))) {
        errors.phone_number = 'Phone number is invalid';
      }
    } else if (entityType === 'teacher') {
      errors = validateTeacherData(editFormData);
    } else if (entityType === 'gradeSection') {
      errors = validateGradeSectionData(editFormData);
    } else if (entityType === 'subject') {
      errors = validateSubjectData(editFormData);
    }
    
    setValidationErrors(errors);
    return errors;
  };

  const saveEdit = async (entityId, currentClass, updateService) => {
    try {
      setSaving(true);
      
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        throw new Error('Please fix the validation errors');
      }
      
      const updatedEntity = await updateService(entityId, editFormData);
      
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
          return prevEntities.map(entity => 
            entity.id === entityId ? updatedEntity : entity
          );
        }
      });

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