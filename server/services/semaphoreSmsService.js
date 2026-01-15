// semaphoreSmsService.js - Semaphore SMS Service for Philippines
import { supabase } from '../config/supabase.js';

// ==================== SEMAPHORE SMS CORE ====================

// Format phone for Semaphore (09XXXXXXXXX or +639XXXXXXXXX)
export const formatPhoneForSemaphore = (phone) => {
  if (!phone) return null;
  
  let cleaned = phone.replace(/\D/g, '');
  
  // Convert to 09XXXXXXXXX format (preferred for Semaphore)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return cleaned; // Already 09XXXXXXXXX
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    return '0' + cleaned; // 9171234567 → 09171234567
  } else if (cleaned.startsWith('63') && cleaned.length === 12) {
    return '0' + cleaned.substring(2); // 639171234567 → 09171234567
  } else if (cleaned.startsWith('+63') && cleaned.length === 13) {
    return '0' + cleaned.substring(3); // +639171234567 → 09171234567
  }
  
  console.log(`⚠️ Invalid PH number for Semaphore: ${phone} -> ${cleaned}`);
  return null;
};

// Get Philippines time
export const getPhilippinesTime = () => {
  const now = new Date();
  const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  return manilaTime.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
};

// Get Philippines date
export const getPhilippinesDate = () => {
  const now = new Date();
  const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  return manilaTime.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
};

// Send SMS via Semaphore
async function sendViaSemaphore(phone, message) {
  try {
    const formattedPhone = formatPhoneForSemaphore(phone);
    if (!formattedPhone) {
      throw new Error('Invalid phone format');
    }
    
    console.log(`📱 [Semaphore] Sending to ${formattedPhone}`);
    
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const senderName = process.env.SEMAPHORE_SENDER_NAME || 'Semaphore';
    
    // Semaphore API v4 (latest)
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: apiKey,
        number: formattedPhone,
        message: message.substring(0, 160),
        sendername: senderName.substring(0, 11) // Max 11 chars
      })
    });
    
    const result = await response.json();
    console.log('✅ Semaphore response:', result);
    
    if (Array.isArray(result) && result[0]?.status === 'Success') {
      return {
        success: true,
        provider: 'semaphore',
        messageId: result[0]?.message_id || null,
        cost: '₱0.60-₱0.80',
        creditCost: 1 // 1 credit per SMS
      };
    } else {
      throw new Error(result[0]?.message || result?.error || 'Semaphore SMS failed');
    }
  } catch (error) {
    console.error('❌ Semaphore SMS error:', error);
    throw error;
  }
}

// Demo mode (fallback)
async function sendDemoSMS(phone, message) {
  console.log('🎓 [Demo Mode] Semaphore SMS System Active');
  console.log(`📱 To: ${phone}`);
  console.log(`📱 Formatted: ${formatPhoneForSemaphore(phone)}`);
  console.log(`💬 Message: ${message.substring(0, 60)}...`);
  console.log(`💰 Production Cost: ₱0.60-₱0.80 per SMS`);
  console.log(`⚡ Instant Delivery: Free 50 credits on signup`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    provider: 'semaphore (demo mode)',
    demo: true,
    cost: '₱0.60-₱0.80',
    note: 'Semaphore - Get free 50 credits on signup'
  };
}

// Check Semaphore balance
export const checkSemaphoreBalance = async () => {
  try {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    if (!apiKey) return null;
    
    const response = await fetch(`https://api.semaphore.co/api/v4/account?apikey=${apiKey}`);
    const data = await response.json();
    
    return {
      balance: data.credit_balance,
      name: data.account_name,
      email: data.email
    };
  } catch (error) {
    console.error('❌ Semaphore balance check error:', error);
    return null;
  }
};

// ==================== MAIN SMS FUNCTION ====================

export const sendAttendanceSMS = async (studentId, scanType) => {
  try {
    console.log(`📱 Starting Semaphore SMS for student ${studentId}, scan: ${scanType}`);
    
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
      console.log(`⚠️ No phone for ${student.guardian_first_name}`);
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
      message = `🏫 Magandang araw ${guardianName}! Ang iyong anak na si ${studentName} ay nakarating na sa paaralan ngayong ${currentTime} (${currentDate}).`;
    } else if (scanType === 'out') {
      message = `🚪 Kumusta ${guardianName}! Si ${studentName} ay umalis na sa paaralan ngayong ${currentTime} (${currentDate}). Ingat pauwi!`;
    } else {
      message = `ℹ️ Hello ${guardianName}! Na-record ang attendance ni ${studentName} ngayong ${currentTime} (${currentDate}).`;
    }
    
    console.log(`📤 Preparing Semaphore SMS to ${student.guardian_phone_number}`);
    console.log(`📱 Formatted: ${formatPhoneForSemaphore(student.guardian_phone_number)}`);
    
    // 4. BUSINESS HOURS CHECK
    const smsEnabled = process.env.SMS_ENABLED === 'true';
    const startHour = parseInt(process.env.SMS_BUSINESS_HOURS_START) || 6;
    const endHour = parseInt(process.env.SMS_BUSINESS_HOURS_END) || 21;
    
    if (smsEnabled) {
      const now = new Date();
      const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      const currentHour = manilaTime.getHours();
      
      if (currentHour < startHour || currentHour >= endHour) {
        console.log(`🌙 Outside business hours (${startHour}:00-${endHour}:00)`);
        
        await supabase.from('sms_logs').insert({
          student_id: student.id,
          student_lrn: student.lrn,
          guardian_name: student.guardian_first_name,
          phone_number: student.guardian_phone_number,
          message: message,
          scan_type: scanType,
          provider: 'semaphore',
          status: 'skipped',
          reason: 'outside_business_hours',
          sent_at: new Date().toISOString()
        });
        
        return {
          success: true,
          skipped: true,
          message: 'SMS skipped (outside business hours)'
        };
      }
    }
    
    // 5. RATE LIMIT CHECK
    const limitMinutes = parseInt(process.env.SMS_RATE_LIMIT_MINUTES) || 30;
    const { data: recentSMS } = await supabase
      .from('sms_logs')
      .select('sent_at')
      .eq('student_id', studentId)
      .eq('scan_type', scanType)
      .gte('sent_at', new Date(Date.now() - limitMinutes * 60000).toISOString())
      .limit(1);
    
    if (recentSMS && recentSMS.length > 0) {
      console.log(`⏸️ Rate limited (${limitMinutes} minutes)`);
      return {
        success: false,
        rateLimited: true,
        message: `Please wait ${limitMinutes} minutes`
      };
    }
    
    // 6. SEND SMS
    let result;
    
    // Try real Semaphore if configured
    if (process.env.SEMAPHORE_API_KEY) {
      try {
        result = await sendViaSemaphore(student.guardian_phone_number, message);
      } catch (semaphoreError) {
        console.log('⚠️ Semaphore failed, using demo mode:', semaphoreError.message);
        result = await sendDemoSMS(student.guardian_phone_number, message);
      }
    } else {
      // No Semaphore config, use demo
      result = await sendDemoSMS(student.guardian_phone_number, message);
    }
    
    // 7. LOG SMS
    const logData = {
      student_id: student.id,
      student_lrn: student.lrn,
      guardian_name: student.guardian_first_name,
      phone_number: student.guardian_phone_number,
      formatted_phone: formatPhoneForSemaphore(student.guardian_phone_number),
      message: message,
      scan_type: scanType,
      provider: result.provider,
      status: result.success ? 'sent' : 'failed',
      cost: result.cost,
      demo_mode: result.demo || false,
      sent_at: new Date().toISOString()
    };
    
    await supabase.from('sms_logs').insert(logData);
    
    return {
      success: result.success,
      provider: result.provider,
      cost: result.cost,
      demo: result.demo || false,
      message: 'SMS processed successfully'
    };
    
  } catch (error) {
    console.error('❌ Semaphore SMS Error:', error);
    
    await supabase.from('sms_errors').insert({
      student_id: studentId,
      error_message: error.message,
      scan_type: scanType,
      provider: 'semaphore',
      created_at: new Date().toISOString()
    });
    
    return {
      success: false,
      message: `Failed: ${error.message}`
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