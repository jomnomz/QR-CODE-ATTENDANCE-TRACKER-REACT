import twilio from 'twilio';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';

dotenv.config();

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Format phone number to E.164 (Philippines format)
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Philippines phone numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Convert 09XXXXXXXXX to +639XXXXXXXXX
    cleaned = '+63' + cleaned.substring(1);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    // 9XXXXXXXXX to +639XXXXXXXXX
    cleaned = '+63' + cleaned;
  } else if (cleaned.startsWith('63') && cleaned.length === 12) {
    // 63XXXXXXXXXX to +63XXXXXXXXXX
    cleaned = '+' + cleaned;
  }
  
  // Final check for proper format
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

// Get Philippines time string
export const getPhilippinesTime = () => {
  const now = new Date();
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
};

// Get Philippines date string
export const getPhilippinesDate = () => {
  const now = new Date();
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
};

// Main function to send attendance SMS
export const sendAttendanceSMS = async (studentId, scanType) => {
  try {
    console.log(`📱 Starting SMS process for student ${studentId}, scan: ${scanType}`);
    
    // 1. Get student and guardian info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        lrn,
        first_name,
        last_name,
        middle_name,
        guardian_first_name,
        guardian_last_name,
        guardian_phone_number
      `)
      .eq('id', studentId)
      .single();
    
    if (studentError) throw new Error(`Student fetch error: ${studentError.message}`);
    if (!student) throw new Error('Student not found');
    
    // 2. Check if guardian has phone number
    if (!student.guardian_phone_number) {
      console.log(`⚠️ No phone number for ${student.guardian_first_name} ${student.guardian_last_name}`);
      return {
        success: false,
        message: 'No guardian phone number available'
      };
    }
    
    // 3. Format phone number
    const toPhone = formatPhoneNumber(student.guardian_phone_number);
    
    if (!toPhone || toPhone.length < 10) {
      console.log(`⚠️ Invalid phone format: ${student.guardian_phone_number}`);
      return {
        success: false,
        message: 'Invalid phone number format'
      };
    }
    
    // 4. Create personalized message
    const studentName = `${student.first_name} ${student.last_name}`;
    const guardianName = `${student.guardian_first_name} ${student.guardian_last_name}`;
    const currentTime = getPhilippinesTime();
    const currentDate = getPhilippinesDate();
    
    let message;
    if (scanType === 'in') {
      message = `🏫 Good day ${guardianName}! Your child ${studentName} has arrived at school on ${currentDate} at ${currentTime}. Have a great day!`;
    } else if (scanType === 'out') {
      message = `🚪 Hello ${guardianName}! ${studentName} has left school on ${currentDate} at ${currentTime}. See you tomorrow!`;
    } else {
      message = `ℹ️ Hello ${guardianName}! ${studentName}'s attendance was recorded on ${currentDate} at ${currentTime}.`;
    }
    
    // 5. Send SMS via Twilio
    console.log(`📤 Sending SMS to ${toPhone}`);
    
    const twilioResponse = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone
    });
    
    console.log(`✅ SMS sent! SID: ${twilioResponse.sid}`);
    
    // 6. Log SMS in database for audit trail
    const { error: logError } = await supabase
      .from('sms_logs')
      .insert({
        student_id: student.id,
        student_lrn: student.lrn,
        guardian_name: guardianName,
        phone_number: toPhone,
        message: message,
        scan_type: scanType,
        twilio_sid: twilioResponse.sid,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    
    if (logError) {
      console.error('⚠️ Failed to log SMS:', logError);
    }
    
    return {
      success: true,
      message: 'SMS sent successfully',
      sid: twilioResponse.sid,
      to: toPhone
    };
    
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    
    // Log the failure
    try {
      await supabase
        .from('sms_errors')
        .insert({
          student_id: studentId,
          error_message: error.message,
          error_code: error.code,
          scan_type: scanType,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
    
    return {
      success: false,
      message: `Failed to send SMS: ${error.message}`
    };
  }
};

// Function to check if SMS should be sent (rate limiting)
export const shouldSendSMS = async (studentId, scanType) => {
  try {
    // Check if SMS was already sent for this scan type today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: recentSMS, error } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('scan_type', scanType)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .lte('sent_at', `${today}T23:59:59.999Z`)
      .limit(1);
    
    if (error) {
      console.error('Error checking recent SMS:', error);
      return true; // Allow sending if check fails
    }
    
    // If SMS was already sent today, don't send again
    if (recentSMS && recentSMS.length > 0) {
      console.log(`⏸️ SMS already sent today for student ${studentId}, scan ${scanType}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in shouldSendSMS:', error);
    return true;
  }
};