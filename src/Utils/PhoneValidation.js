export const validateAndFormatPhone = (phone) => {
  if (!phone) {
    return { 
      isValid: true, // Phone is optional, so empty is valid
      formatted: null, 
      error: null 
    };
  }

  const phoneStr = phone.toString().trim();
  
  // Remove all non-digit characters except +
  const cleanPhone = phoneStr.replace(/[^\d+]/g, '');
  
  // Check for valid Philippine mobile number formats
  // 1. 09XXXXXXXXX (11 digits)
  if (cleanPhone.match(/^09\d{9}$/)) {
    return {
      isValid: true,
      formatted: '+63' + cleanPhone.substring(1), // Convert to +639XXXXXXXXX
      error: null
    };
  }
  
  // 2. 9XXXXXXXXX (10 digits, starts with 9)
  if (cleanPhone.match(/^9\d{9}$/)) {
    return {
      isValid: true,
      formatted: '+63' + cleanPhone, // Convert to +639XXXXXXXXX
      error: null
    };
  }
  
  // 3. +639XXXXXXXXX (13 characters, starts with +63)
  if (phoneStr.match(/^\+639\d{9}$/)) {
    return {
      isValid: true,
      formatted: phoneStr, // Already in correct format
      error: null
    };
  }
  
  // 4. 639XXXXXXXXX (12 digits, starts with 63)
  if (cleanPhone.match(/^639\d{9}$/)) {
    return {
      isValid: true,
      formatted: '+' + cleanPhone, // Convert to +639XXXXXXXXX
      error: null
    };
  }
  
  // Invalid format
  return {
    isValid: false,
    formatted: null,
    error: 'Phone number must be a valid Philippine mobile number. Acceptable formats: 09171234567, 9171234567, +639171234567, or 639171234567'
  };
};

/**
 * Simple format for Philippine numbers - just formats without validation
 */
export const formatPhilippinePhone = (phone) => {
  if (!phone) return null;
  
  const phoneStr = phone.toString().trim();
  const digitsOnly = phoneStr.replace(/\D/g, '');
  
  // Convert to E.164 format for PH
  if (digitsOnly.length === 11 && digitsOnly.startsWith('09')) {
    return '+63' + digitsOnly.substring(1); // 09171234567 → +639171234567
  }
  
  if (digitsOnly.length === 10 && digitsOnly.startsWith('9')) {
    return '+63' + digitsOnly; // 9171234567 → +639171234567
  }
  
  if (digitsOnly.length === 12 && digitsOnly.startsWith('63')) {
    return '+' + digitsOnly; // 639171234567 → +639171234567
  }
  
  if (phoneStr.startsWith('+63') && phoneStr.length === 13) {
    return phoneStr; // Already in E.164
  }
  
  // Return null for invalid formats
  return null;
};