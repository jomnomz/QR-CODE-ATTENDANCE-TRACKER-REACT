// iProgService.js - LOCAL DEMO ONLY (No real SMS)
import { supabase } from '../config/supabase.js';

// ==================== CONFIGURATION ====================
const DEMO_MODE = true;  // ← SET THIS TO TRUE FOR LOCAL DEMO
const DEMO_PREFIX = '🚫 [DEMO MODE]';

// ==================== UTILITY FUNCTIONS ====================

// Format phone for display only
export const formatPhoneForIprog = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return cleaned;
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    return '0' + cleaned;
  } else if (cleaned.startsWith('63') && cleaned.length === 12) {
    return '0' + cleaned.substring(2);
  }
  return phone;
};

// Get Philippines time (display format)
export const getPhilippinesTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
};

// Get Philippines date (display format)
export const getPhilippinesDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
};

// Get Philippines date in YYYY-MM-DD format (for database)
const getPhilippinesDateISO = () => {
  const now = new Date();
  // Add 8 hours to convert UTC to PH time (UTC+8)
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime.toISOString().split('T')[0];
};

// Get Philippines timestamp in ISO format (for sent_at)
const getPhilippinesTimestamp = () => {
  const now = new Date();
  // Add 8 hours to convert UTC to PH time (UTC+8)
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime.toISOString();
};

// ==================== DEMO SMS FUNCTION ====================

async function sendDemoSMS(phone, message) {
  const formattedPhone = formatPhoneForIprog(phone);
  const messageId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`\n${DEMO_PREFIX} ======================================`);
  console.log(`${DEMO_PREFIX} 📱 DEMO SMS GENERATED`);
  console.log(`${DEMO_PREFIX} ======================================`);
  console.log(`${DEMO_PREFIX} To: ${phone}`);
  console.log(`${DEMO_PREFIX} Formatted: ${formattedPhone}`);
  console.log(`${DEMO_PREFIX} Message ID: ${messageId}`);
  console.log(`${DEMO_PREFIX} Length: ${message.length} chars`);
  console.log(`${DEMO_PREFIX} Time: ${getPhilippinesTime()}`);
  console.log(`${DEMO_PREFIX} Date: ${getPhilippinesDate()}`);
  console.log(`${DEMO_PREFIX} --------------------------------------`);
  console.log(`${DEMO_PREFIX} 📝 MESSAGE CONTENT:`);
  console.log(`${DEMO_PREFIX} ${message}`);
  console.log(`${DEMO_PREFIX} --------------------------------------`);
  console.log(`${DEMO_PREFIX} 💰 SAVED: ₱0.30 (No real SMS sent)`);
  console.log(`${DEMO_PREFIX} 🔒 SECURITY: No API calls made`);
  console.log(`${DEMO_PREFIX} ======================================\n`);
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    success: true,
    provider: 'demo',
    demo: true,
    cost: '₱0.00',
    messageId: messageId,
    note: 'Local demo mode - no real SMS sent'
  };
}

// Mock iProg function that NEVER makes API calls
async function sendViaIprog(phone, message) {
  console.log(`\n${DEMO_PREFIX} ⚠️  API CALL BLOCKED - USING LOCAL DEMO`);
  console.log(`${DEMO_PREFIX} This would have called: https://www.iprogsms.com/api/v1/sms_messages`);
  console.log(`${DEMO_PREFIX} API Token would have been: ${process.env.IPROG_API_TOKEN ? '[HIDDEN]' : 'NOT SET'}`);
  
  // Force fallback to demo mode
  return sendDemoSMS(phone, message);
}

// Check iProg balance - demo version
export const checkIprogBalance = async () => {
  return {
    provider: 'demo',
    status: 'demo_mode',
    configured: false,
    demo_mode: true,
    balance: '∞ credits',
    cost_per_sms: '₱0.00',
    sender_id: 'STO NINO (DEMO)',
    note: 'Local demo mode - no real SMS credits used',
    warning: 'All SMS are simulated locally'
  };
};

// ==================== MAIN SMS FUNCTION ====================

export const sendAttendanceSMS = async (studentId, scanType) => {
  try {
    console.log(`\n${DEMO_PREFIX} 📱 Processing student ${studentId}, scan: ${scanType}`);
    
    // 1. Get student info
    const { data: student, error } = await supabase
      .from('students')
      .select(`
        id, lrn, first_name, last_name,
        guardian_first_name, guardian_phone_number
      `)
      .eq('id', studentId)
      .single();
    
    if (error || !student) {
      throw new Error(`Student not found: ${error?.message}`);
    }
    
    // 2. Check phone
    if (!student.guardian_phone_number) {
      console.log(`${DEMO_PREFIX} ⚠️ No phone for ${student.guardian_first_name}`);
      return {
        success: false,
        message: 'No guardian phone number'
      };
    }
    
    // 3. Create Filipino message
    const studentName = `${student.first_name} ${student.last_name}`;
    const guardianName = student.guardian_first_name;
    const currentTime = getPhilippinesTime();
    const currentDate = getPhilippinesDate();
    
    let message;
    if (scanType === 'in') {
      message = `Magandang araw ${guardianName}! Ang iyong anak na si ${studentName} ay nakarating na sa paaralan ngayong ${currentTime} (${currentDate}).`;
    } else if (scanType === 'out') {
      message = `Kumusta ${guardianName}! Si ${studentName} ay umalis na sa paaralan ngayong ${currentTime} (${currentDate}). Ingat pauwi!`;
    } else {
      message = `Hello ${guardianName}! Na-record ang attendance ni ${studentName} ngayong ${currentTime} (${currentDate}).`;
    }
    
    // 4. FORCE DEMO MODE (override any API token)
    console.log(`${DEMO_PREFIX} 🔐 DEMO MODE ACTIVE - No real SMS will be sent`);
    
    let result = await sendDemoSMS(student.guardian_phone_number, message);
    
    // 5. Get PHILIPPINES timestamp for database (UTC+8)
    const philippinesTimestamp = getPhilippinesTimestamp();
    
    // 6. LOG SMS - WITH CORRECT PH TIMEZONE
    const logData = {
      student_id: student.id,
      student_lrn: student.lrn,
      guardian_name: student.guardian_first_name,
      phone_number: student.guardian_phone_number,
      formatted_phone: formatPhoneForIprog(student.guardian_phone_number),
      message: message.substring(0, 500), // Truncate if too long
      scan_type: scanType, // Must be 'in' or 'out' exactly
      provider: 'demo',
      provider_id: null,
      status: 'sent', // MUST be 'sent' not 'demo_simulated'
      cost: '₱0.00',
      reason: 'LOCAL DEMO - No real SMS sent',
      demo_mode: true,
      message_id: result.messageId,
      sent_at: philippinesTimestamp, // ← STORE IN PH TIME (UTC+8)
      // created_at will auto-populate with current timestamp
    };
    
    console.log(`${DEMO_PREFIX} 📊 Inserting to sms_logs with PH time...`);
    console.log(`${DEMO_PREFIX} sent_at (PH time): ${philippinesTimestamp}`);
    
    const { data: insertedLog, error: logError } = await supabase
      .from('sms_logs')
      .insert(logData)
      .select('id, sent_at, status, message_id, created_at');
    
    if (logError) {
      console.error(`${DEMO_PREFIX} ❌ Database insert error:`, logError.message);
      
      // Try simpler insert with PH time
      const simpleData = {
        student_id: student.id,
        phone_number: student.guardian_phone_number.substring(0, 20),
        message: message.substring(0, 100),
        scan_type: scanType,
        provider: 'demo',
        status: 'sent',
        sent_at: philippinesTimestamp
      };
      
      const { error: simpleError } = await supabase
        .from('sms_logs')
        .insert(simpleData);
      
      if (simpleError) {
        console.error(`${DEMO_PREFIX} ❌ Simple insert also failed:`, simpleError.message);
      } else {
        console.log(`${DEMO_PREFIX} ✅ Minimal log entry created with PH time`);
      }
    } else {
      console.log(`${DEMO_PREFIX} ✅ Logged to database successfully. ID:`, insertedLog[0]?.id);
      console.log(`${DEMO_PREFIX} Database sent_at:`, insertedLog[0]?.sent_at);
    }
    
    return {
      success: true,
      provider: result.provider,
      cost: result.cost,
      demo: true,
      messageId: result.messageId,
      message: 'SMS simulated in local demo mode',
      warning: 'No real SMS was sent'
    };
    
  } catch (error) {
    console.error(`${DEMO_PREFIX} ❌ Error in sendAttendanceSMS:`, error.message);
    
    // Log error to sms_errors table
    const errorLog = {
      student_id: studentId,
      error_message: `DEMO ERROR: ${error.message}`,
      provider: 'demo',
      scan_type: scanType || null,
      phone_number: null
    };
    
    try {
      await supabase.from('sms_errors').insert(errorLog);
      console.log(`${DEMO_PREFIX} ✅ Error logged to sms_errors`);
    } catch (dbError) {
      console.error(`${DEMO_PREFIX} ❌ Failed to log error:`, dbError.message);
    }
    
    return {
      success: false,
      message: `Demo error: ${error.message}`
    };
  }
};

// Rate limit check
export const shouldSendSMS = async (studentId, scanType) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: recentSMS } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('scan_type', scanType)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .lte('sent_at', `${today}T23:59:59.999Z`)
      .limit(1);
    
    return !(recentSMS && recentSMS.length > 0);
  } catch (error) {
    console.error('Rate check error:', error);
    return true;
  }
};

// Export sendViaIprog for server.js
export { sendViaIprog };
