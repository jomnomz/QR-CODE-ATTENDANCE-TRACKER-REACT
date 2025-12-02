import { useState } from 'react';
import { validateStudentData } from '../../Utils/StudentDataValidation'; 

export const useEntityEdit = (entities, setEntities, entityType = 'student', refreshAll = null) => {
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const startEdit = (entity) => {
    setEditingId(entity.id);
    
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
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const updateEditField = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveEdit = async (entityId, currentClass, updateService) => {
    try {
      setSaving(true);
      
      // Validation based on entity type
      if (entityType === 'student') {
        const errors = validateStudentData(editFormData);
        if (Object.keys(errors).length > 0) {
          throw new Error('Validation errors: ' + Object.values(errors).join(', '));
        }
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
          // For guardians or other entities
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
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return {
    editingId,
    editFormData,
    saving,
    startEdit,
    cancelEdit,
    updateEditField,
    saveEdit,
    entityType
  };
};