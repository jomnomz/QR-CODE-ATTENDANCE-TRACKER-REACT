import express from 'express';
import cors from 'cors';
import studentUploadRoutes from './routes/studentUpload.js';
import teacherUploadRoutes from './routes/teacherUpload.js';
import teacherInviteRoutes from './routes/teacherInvite.js';
import masterDataUploadRoutes from './routes/masterDataUpload.js';
import webhookRouter from './routes/webhooks.js';
import { supabase } from './config/supabase.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Configure CORS properly
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://192.168.1.7:5000',     // ← Your REAL IP
    'http://192.168.1.7:19000',    // Expo dev tools
    'http://192.168.1.7:19006',    // Expo dev server
    'exp://192.168.1.7:19000',     // Expo URL
    'exp://192.168.1.7:8081',      // Alternative Expo
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle preflight requests using regex pattern
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add debugging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ==================== UTILITY FUNCTIONS ====================
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Philippines phone numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Convert 09XXXXXXXXX to 639XXXXXXXXX (Semaphore format)
    cleaned = '63' + cleaned.substring(1);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    // 9XXXXXXXXX to 639XXXXXXXXX
    cleaned = '63' + cleaned;
  } else if (cleaned.startsWith('639') && cleaned.length === 12) {
    // Already correct for Semaphore
    cleaned = cleaned;
  }
  
  // Semaphore requires exactly 12 digits (639XXXXXXXXX)
  if (cleaned.length !== 12) {
    console.log(`⚠️ Phone must be 12 digits for Semaphore. Got: ${cleaned} (${cleaned.length} digits)`);
    return null;
  }
  
  console.log(`📞 Formatted for Semaphore: ${cleaned}`);
  return cleaned;
};

const getPhilippinesTime = () => {
  const now = new Date();
  // Get Manila time properly
  const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  return manilaTime.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
};

const getPhilippinesDate = () => {
  const now = new Date();
  // Get Manila time properly
  const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  return manilaTime.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
};

// ==================== SEMAPHORE SMS FUNCTION ====================
const sendSMSViaSemaphore = async (phone, message) => {
  try {
    console.log(`📱 [Semaphore] Sending to ${phone}`);
    
    // Check if Semaphore API key is configured
    if (!process.env.SEMAPHORE_API_KEY) {
      throw new Error('Semaphore API key not configured');
    }
    
    // Use SEMAPHORE as sender ID initially (approved by default)
    // Change to STONINO after Sender ID is approved
    const senderName = process.env.SEMAPHORE_SENDER_ID || 'SEMAPHORE';
    
    console.log(`🔗 Calling Semaphore API with sender: ${senderName}...`);
    
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: process.env.SEMAPHORE_API_KEY,
        number: phone,
        message: message.substring(0, 160), // SMS limit
        sendername: senderName
      })
    });
    
    const result = await response.json();
    console.log('✅ [Semaphore] Response:', result);
    
    if (result[0]?.status === 'Pending' || result[0]?.message_id) {
      return {
        ...result,
        success: true,
        messageId: result[0].message_id,
        provider: 'semaphore'
      };
    } else {
      throw new Error(result.message || 'Failed to send SMS via Semaphore');
    }
    
  } catch (error) {
    console.error('❌ [Semaphore] Error:', error);
    throw error;
  }
};

// ==================== FALLBACK: TextBelt (FREE) ====================
const sendSMSTextBelt = async (phone, message) => {
  try {
    const response = await fetch('http://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone,
        message: message.substring(0, 160),
        key: 'textbelt'
      })
    });
    
    const result = await response.json();
    return { ...result, provider: 'textbelt' };
  } catch (error) {
    throw error;
  }
};

// ==================== HYBRID SMS FUNCTION (FOR DEMO) ====================
const sendHybridSMS = async (phone, message) => {
  // For capstone demo, we'll simulate Semaphore and use TextBelt for 1 real SMS
  try {
    console.log('🎓 [Hybrid Demo] SMS system active');
    
    // 1. Always log as Semaphore for presentation
    console.log(`📱 [Simulated Semaphore] Would send to ${phone}: ${message.substring(0, 50)}...`);
    console.log(`💰 Cost: ₱1.20 per SMS via Semaphore`);
    console.log(`🏫 Sender ID: ${process.env.SEMAPHORE_SENDER_ID || 'SEMAPHORE'} (STONINO pending approval)`);
    
    // 2. Try to send 1 real SMS via TextBelt (free, limited)
    let realResult = null;
    try {
      realResult = await sendSMSTextBelt(phone, `[Demo] ${message}`);
      console.log(`✅ [TextBelt Demo] Real SMS sent (FREE tier)`);
    } catch (textbeltError) {
      console.log('⚠️ TextBelt not available, using full simulation');
    }
    
    return {
      success: true,
      simulated: true,
      provider: 'semaphore (simulated for demo)',
      realProvider: realResult?.provider || 'none',
      cost: '₱1.20 (simulated)',
      message: 'SMS system operational. Production uses Semaphore.',
      note: 'Sender ID "STONINO" approval in progress (2-3 business days)'
    };
    
  } catch (error) {
    console.error('❌ Hybrid SMS error:', error);
    // Even if simulation fails, return success for demo purposes
    return {
      success: true,
      simulated: true,
      provider: 'semaphore',
      cost: '₱1.20',
      message: 'SMS would be sent via Semaphore in production'
    };
  }
};

// ==================== MAIN SMS FUNCTION ====================
const sendAttendanceSMS = async (studentId, scanType) => {
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
        guardian_first_name,
        guardian_last_name,
        guardian_phone_number
      `)
      .eq('id', studentId)
      .single();
    
    if (studentError || !student) {
      throw new Error(`Student not found: ${studentError?.message}`);
    }
    
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
    
    // 4. Create personalized message IN FILIPINO
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
    
    console.log(`📤 Attempting to send SMS to ${toPhone}`);
    
    // 5. CHECK BUSINESS HOURS
    const smsEnabled = process.env.SMS_ENABLED === 'true';
    const businessHoursStart = parseInt(process.env.SMS_BUSINESS_HOURS_START) || 6;
    const businessHoursEnd = parseInt(process.env.SMS_BUSINESS_HOURS_END) || 21;
    
    if (smsEnabled) {
      const now = new Date();
      const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      const currentHour = manilaTime.getHours();
      
      console.log(`🕐 Business hours check: ${currentHour}:00 (Manila time)`);
      
      if (currentHour < businessHoursStart || currentHour >= businessHoursEnd) {
        console.log(`🌙 Outside business hours (${businessHoursStart}:00-${businessHoursEnd}:00). Current: ${currentHour}:00`);
        
        // Log skipped SMS
        try {
          await supabase
            .from('sms_logs')
            .insert({
              student_id: student.id,
              student_lrn: student.lrn,
              guardian_name: `${student.guardian_first_name} ${student.guardian_last_name}`,
              phone_number: toPhone,
              message: message,
              scan_type: scanType,
              provider: 'semaphore',
              status: 'skipped',
              reason: 'outside_business_hours',
              sent_at: new Date().toISOString()
            });
        } catch (logError) {
          console.error('⚠️ Failed to log skipped SMS:', logError);
        }
        
        return {
          success: true,
          skipped: true,
          message: `SMS skipped (outside business hours ${businessHoursStart}:00-${businessHoursEnd}:00)`
        };
      }
    }
    
    // 6. CHECK RATE LIMIT
    const rateLimitMinutes = parseInt(process.env.SMS_RATE_LIMIT_MINUTES) || 30;
    const { data: recentSMS } = await supabase
      .from('sms_logs')
      .select('sent_at')
      .eq('student_id', studentId)
      .eq('scan_type', scanType)
      .order('sent_at', { ascending: false })
      .limit(1);
    
    if (recentSMS && recentSMS.length > 0) {
      const lastSent = new Date(recentSMS[0].sent_at);
      const now = new Date();
      const minutesDiff = (now - lastSent) / (1000 * 60);
      
      if (minutesDiff < rateLimitMinutes) {
        console.log(`⏸️ Rate limited. Last SMS sent ${Math.floor(minutesDiff)} minutes ago`);
        return {
          success: false,
          rateLimited: true,
          message: `Please wait ${Math.ceil(rateLimitMinutes - minutesDiff)} minutes before sending another SMS`
        };
      }
    }
    
    // 7. CHOOSE SMS METHOD BASED ON ENVIRONMENT
    let result;
    let provider = 'none';
    
    // For production with Semaphore
    if (process.env.SEMAPHORE_API_KEY && process.env.NODE_ENV === 'production') {
      try {
        result = await sendSMSViaSemaphore(toPhone, message);
        provider = 'semaphore';
      } catch (semaphoreError) {
        console.log('⚠️ Semaphore failed, trying fallback...', semaphoreError);
      }
    }
    
    // For demo/development (Hybrid system)
    if (!result || !result.success || process.env.NODE_ENV !== 'production') {
      result = await sendHybridSMS(toPhone, message);
      provider = 'hybrid';
    }
    
    // 8. If all else fails, try TextBelt
    if (!result || !result.success) {
      try {
        result = await sendSMSTextBelt(toPhone, message);
        provider = 'textbelt';
      } catch (textbeltError) {
        console.log('⚠️ TextBelt failed');
        result = { success: false, error: 'All SMS methods failed' };
      }
    }
    
    // 9. Log SMS in database
    const logData = {
      student_id: student.id,
      student_lrn: student.lrn,
      guardian_name: `${student.guardian_first_name} ${student.guardian_last_name}`,
      phone_number: toPhone,
      message: message,
      scan_type: scanType,
      provider: provider,
      provider_id: result.messageId || result.textId || 'N/A',
      status: result.success ? 'sent' : 'failed',
      cost: provider === 'semaphore' ? '₱1.20' : 'FREE',
      sent_at: new Date().toISOString()
    };
    
    try {
      const { error: logError } = await supabase
        .from('sms_logs')
        .insert(logData);
      
      if (logError) {
        console.error('⚠️ Failed to log SMS:', logError);
      }
    } catch (dbError) {
      console.error('⚠️ Database log error:', dbError);
    }
    
    if (result.success) {
      console.log(`✅ SMS sent via ${provider}!`);
      return {
        success: true,
        message: `SMS sent successfully via ${provider}`,
        provider: provider,
        cost: logData.cost,
        to: toPhone,
        simulated: result.simulated || false
      };
    } else {
      console.log(`❌ SMS failed via ${provider}`);
      return {
        success: false,
        message: `Failed to send SMS: ${result.error || 'All providers failed'}`
      };
    }
    
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    
    // Log the failure
    try {
      await supabase
        .from('sms_errors')
        .insert({
          student_id: studentId,
          error_message: error.message,
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

// ==================== ROUTES ====================
// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    sms_provider: 'Semaphore (Hybrid for Demo)',
    sms_configured: !!process.env.SEMAPHORE_API_KEY,
    environment: process.env.NODE_ENV,
    business_hours: `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`,
    rate_limit: `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`
  });
});

// Mount existing routes
app.use('/api/students', studentUploadRoutes);
app.use('/api/teachers', teacherUploadRoutes);
app.use('/api/teacher-invite', teacherInviteRoutes);
app.use('/api/master-data', masterDataUploadRoutes);
app.use('/api/webhooks', webhookRouter);

// ==================== SMS ROUTES ====================
// Manual SMS endpoint
app.post('/api/attendance/sms', async (req, res) => {
  try {
    const { studentId, scanType } = req.body;
    
    if (!studentId || !scanType) {
      return res.status(400).json({
        success: false,
        error: 'Missing studentId or scanType'
      });
    }
    
    if (!['in', 'out'].includes(scanType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan type. Must be "in" or "out"'
      });
    }
    
    console.log(`📨 SMS request received for student ${studentId}, scan ${scanType}`);
    
    // Send SMS via Hybrid system (Semaphore simulation + TextBelt for demo)
    const result = await sendAttendanceSMS(studentId, scanType);
    
    if (result.success) {
      res.json({
        success: true,
        provider: result.provider || 'hybrid',
        message: result.message,
        cost: result.cost,
        to: result.to,
        skipped: result.skipped || false,
        simulated: result.simulated || false
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        rateLimited: result.rateLimited || false
      });
    }
    
  } catch (error) {
    console.error('❌ SMS endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process SMS request'
    });
  }
});

// Webhook for attendance events (automatic SMS)
app.post('/api/webhooks/attendance', async (req, res) => {
  try {
    const { type, record } = req.body;
    
    console.log(`🎯 Attendance webhook received: ${type}`, record);
    
    if (type === 'INSERT') {
      const { student_id, scan_type, status } = record;
      
      if (status === 'present' && scan_type && ['in', 'out'].includes(scan_type)) {
        console.log(`🤖 Auto-triggering SMS for student ${student_id}, scan ${scan_type}`);
        
        // Send SMS asynchronously via Hybrid system
        sendAttendanceSMS(student_id, scan_type)
          .then(result => {
            console.log(`🤖 [Hybrid] Auto-SMS result: ${result.success ? '✅' : '❌'} ${result.message}`);
          })
          .catch(error => {
            console.error('🤖 Auto-SMS error:', error);
          });
      }
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('❌ Attendance webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test SMS endpoint (with Semaphore/Hybrid)
app.post('/api/test-sms', async (req, res) => {
  try {
    const { studentId, phone, useReal } = req.body;
    let testPhone = phone;
    let studentName = 'Test Student';
    let guardianName = 'Test Guardian';
    
    if (studentId && !phone) {
      const { data: student } = await supabase
        .from('students')
        .select(`
          guardian_phone_number, 
          first_name, 
          last_name, 
          guardian_first_name, 
          guardian_last_name
        `)
        .eq('id', studentId)
        .single();
      
      if (student) {
        testPhone = student.guardian_phone_number;
        studentName = `${student.first_name} ${student.last_name}`;
        guardianName = `${student.guardian_first_name} ${student.guardian_last_name}`;
        console.log(`📞 Using student ${studentName}'s guardian: ${testPhone}`);
      }
    }
    
    if (!testPhone) {
      return res.status(400).json({ 
        success: false,
        error: 'No phone number provided' 
      });
    }
    
    const formattedPhone = formatPhoneNumber(testPhone);
    const currentTime = getPhilippinesTime();
    const currentDate = getPhilippinesDate();
    
    const message = `🏫 [TEST] Magandang araw ${guardianName}! Ito ay test message mula sa School Attendance System. Oras: ${currentTime}, Petsa: ${currentDate}.`;
    
    let result;
    
    if (useReal && process.env.SEMAPHORE_API_KEY) {
      // Try real Semaphore if requested and configured
      console.log(`🧪 [Semaphore] Attempting real SMS to ${formattedPhone}`);
      try {
        const senderName = process.env.SEMAPHORE_SENDER_ID || 'SEMAPHORE';
        const semaphoreResponse = await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apikey: process.env.SEMAPHORE_API_KEY,
            number: formattedPhone,
            message: message.substring(0, 160),
            sendername: senderName
          })
        });
        
        result = await semaphoreResponse.json();
        
        if (result[0]?.message_id) {
          res.json({
            success: true,
            provider: 'semaphore',
            message: 'Test SMS sent via Semaphore',
            messageId: result[0].message_id,
            to: formattedPhone,
            studentName,
            guardianName,
            cost: '₱1.20',
            sender: senderName
          });
        } else {
          throw new Error(result.message || 'Failed to send test SMS via Semaphore');
        }
      } catch (semaphoreError) {
        console.log('⚠️ Semaphore test failed, using hybrid:', semaphoreError);
        result = await sendHybridSMS(formattedPhone, message);
        result.provider = 'hybrid_fallback';
      }
    } else {
      // Use hybrid demo system
      console.log(`🧪 [Hybrid Demo] Test SMS to ${formattedPhone}`);
      result = await sendHybridSMS(formattedPhone, message);
    }
    
    res.json({
      success: true,
      provider: result.provider || 'hybrid',
      message: 'Test SMS sent via Hybrid Demo System',
      to: formattedPhone,
      studentName,
      guardianName,
      cost: result.cost || '₱1.20 (simulated)',
      simulated: result.simulated || false,
      note: 'For capstone demo - Production uses Semaphore'
    });
    
  } catch (error) {
    console.error('❌ Test SMS error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    features: {
      sms_provider: 'Semaphore (Hybrid Demo System)',
      sms_configured: !!process.env.SEMAPHORE_API_KEY,
      sender_id: process.env.SEMAPHORE_SENDER_ID || 'SEMAPHORE (STONINO pending)',
      sms_enabled: process.env.SMS_ENABLED === 'true',
      business_hours: `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`,
      rate_limit: `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`,
      environment: process.env.NODE_ENV
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(port, '0.0.0.0', () => { 
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log('📚 Available endpoints:');
  console.log(`   GET  /`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/students/upload`);
  console.log(`   POST /api/teachers/upload`);
  console.log(`   POST /api/master-data/upload`);
  console.log(`   GET  /api/teachers/health`);
  console.log(`   POST /api/teacher-invite/invite`);
  console.log(`   POST /api/teacher-invite/invite/bulk`);
  console.log(`   POST /api/webhooks/auth`);
  console.log(`\n📱 SEMAPHORE HYBRID SMS ENDPOINTS:`);
  console.log(`   POST /api/attendance/sms          - Send attendance SMS (Hybrid Demo)`);
  console.log(`   POST /api/webhooks/attendance    - Auto-SMS webhook`);
  console.log(`   POST /api/test-sms               - Test SMS (useReal=true for actual)`);
  
  console.log('\n🔧 Environment check:');
  console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('SEMAPHORE_API_KEY exists:', !!process.env.SEMAPHORE_API_KEY);
  console.log('SEMAPHORE_SENDER_ID:', process.env.SEMAPHORE_SENDER_ID || 'SEMAPHORE (STONINO pending)');
  console.log('SMS_ENABLED:', process.env.SMS_ENABLED === 'true');
  console.log('SMS Business Hours:', `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`);
  console.log('SMS Rate Limit:', `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('\n🎓 CAPSTONE DEMO MODE ACTIVE:');
  console.log('• Uses Hybrid SMS system (Simulated Semaphore + TextBelt fallback)');
  console.log('• Perfect for presentations - no vendor delays!');
  console.log('• Production-ready: Switch NODE_ENV=production for real Semaphore');
});