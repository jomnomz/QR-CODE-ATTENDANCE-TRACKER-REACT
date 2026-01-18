// server.js - Main Express Server for Attendance SMS System
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { sendAttendanceSMS, formatPhoneForIprog, checkIprogBalance } from './services/iProgService.js';

// IMPORT THE ROUTERS
import studentUploadRouter from './routes/studentUpload.js';
import teacherUploadRouter from './routes/teacherUpload.js';
import teacherInviteRouter from './routes/teacherInvite.js'; // ADD THIS LINE

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MOUNT ALL THE ROUTERS
app.use('/api/students', studentUploadRouter);
app.use('/api/teachers', teacherUploadRouter);
app.use('/api/teacher-invite', teacherInviteRouter); // ADD THIS LINE

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ========== IPROG SMS ENDPOINTS ==========

// Root endpoint - server status
app.get('/', async (req, res) => {
  const balance = await checkIprogBalance();
  
  res.json({ 
    message: 'IPROG SMS SERVER RUNNING',
    timestamp: new Date().toISOString(),
    provider: 'iProg Philippines',
    configured: !!process.env.IPROG_API_TOKEN ? '✅ Ready' : '❌ No API Token',
    cost_per_sms: '₱0.30 per SMS',
    instant: 'No verification needed for PH numbers',
    status: 'Ready for production'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const balance = await checkIprogBalance();
  
  res.json({ 
    status: '✅ Server Healthy',
    timestamp: new Date().toISOString(),
    sms: {
      provider: 'iProg Philippines',
      configured: !!process.env.IPROG_API_TOKEN,
      sender_id: process.env.IPROG_SENDER_ID || 'STO NINO',
      enabled: process.env.SMS_ENABLED === 'true',
      business_hours: `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`,
      rate_limit: `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`,
      cost_per_sms: '₱0.30',
      instant: 'Works instantly in Philippines',
      credits: '5 free SMS credits'
    },
    environment: process.env.NODE_ENV
  });
});

// Check iProg balance/info
app.get('/api/iproig/balance', async (req, res) => {
  try {
    const balance = await checkIprogBalance();
    
    if (!balance) {
      return res.status(400).json({
        success: false,
        error: 'iProg not configured'
      });
    }
    
    res.json({
      success: true,
      provider: 'iproig',
      balance: balance.balance,
      cost_per_sms: balance.cost_per_sms,
      note: balance.note || 'Check iProg dashboard for exact balance'
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Main SMS endpoint for attendance
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
        error: 'Scan type must be "in" or "out"'
      });
    }
    
    console.log(`📨 iProg SMS request: student ${studentId}, ${scanType}`);
    
    const result = await sendAttendanceSMS(studentId, scanType);
    
    res.json({
      success: result.success,
      provider: result.provider,
      cost: result.cost,
      demo: result.demo || false,
      skipped: result.skipped || false,
      message: result.message,
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('❌ SMS endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test SMS endpoint
app.post('/api/test-iproig-sms', async (req, res) => {
  try {
    const { phone, studentId } = req.body;
    let testPhone = phone;
    let studentName = 'Test Student';
    let guardianName = 'Test Guardian';
    
    if (studentId && !phone) {
      const { data: student } = await supabase
        .from('students')
        .select('guardian_phone_number, first_name, last_name, guardian_first_name')
        .eq('id', studentId)
        .single();
      
      if (student) {
        testPhone = student.guardian_phone_number;
        studentName = `${student.first_name} ${student.last_name}`;
        guardianName = student.guardian_first_name;
      }
    }
    
    if (!testPhone) {
      return res.status(400).json({ 
        success: false,
        error: 'No phone number provided',
        example: '09171234567'
      });
    }
    
    const now = new Date();
    const phTime = now.toLocaleTimeString('en-PH', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Manila'
    });
    
    const phDate = now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
    
    const message = `📱 [IPROG TEST] Magandang araw ${guardianName}! Ito ay test message mula sa iProg SMS. Oras: ${phTime}, Petsa: ${phDate}.`;
    
    // Send via iProg or demo mode
    let result;
    if (process.env.IPROG_API_TOKEN) {
      try {
        const { sendViaIprog } = await import('./services/iProgService.js');
        result = await sendViaIprog(testPhone, message);
      } catch (error) {
        console.log('⚠️ iProg failed, using demo mode:', error.message);
        // Use demo mode if iProg fails
        result = {
          success: true,
          provider: 'iproig (demo)',
          messageId: `demo-${Date.now()}`,
          cost: '₱0.30',
          note: 'iProg demo - add API token for real SMS'
        };
      }
    } else {
      // No API token, use demo
      result = {
        success: true,
        provider: 'iproig (demo)',
        messageId: `demo-${Date.now()}`,
        cost: '₱0.30',
        note: 'Set IPROG_API_TOKEN in .env for real SMS'
      };
    }
    
    res.json({
      success: true,
      phone: testPhone,
      formatted: formatPhoneForIprog(testPhone),
      studentName,
      guardianName,
      provider: result.provider,
      messageId: result.messageId,
      cost: result.cost,
      status: result.status || 'simulated',
      message_preview: message.substring(0, 80) + (message.length > 80 ? '...' : ''),
      note: result.note || 'SMS sent successfully'
    });
    
  } catch (error) {
    console.error('❌ Test SMS error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Webhook for automated attendance SMS
app.post('/api/webhooks/attendance', async (req, res) => {
  try {
    const { student_id, scan_type } = req.body;
    
    if (student_id && scan_type) {
      console.log(`🤖 Auto-SMS triggered for student ${student_id}, ${scan_type}`);
      
      // Send async to avoid blocking the webhook response
      sendAttendanceSMS(student_id, scan_type)
        .then(result => {
          console.log(`🤖 Auto-SMS result: ${result.success ? '✅' : '❌'} (Provider: ${result.provider})`);
        })
        .catch(err => {
          console.error('🤖 Auto-SMS error:', err);
        });
    }
    
    res.json({ received: true, status: 'processing' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== DEBUG ENDPOINTS ==========

app.get('/api/debug/teacher/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: error.message });
    }
    
    res.json({ teacher: data });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/find-teacher', async (req, res) => {
  try {
    const { authUserId, email, employeeId } = req.query;
    
    let query = supabase.from('teachers').select('*');
    
    if (authUserId) {
      query = query.eq('auth_user_id', authUserId);
    } else if (email) {
      query = query.eq('email_address', email);
    } else if (employeeId) {
      query = query.eq('employee_id', employeeId);
    } else {
      return res.status(400).json({ error: 'Provide authUserId, email, or employeeId' });
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      return res.status(404).json({ 
        error: 'Teacher not found',
        details: error.message 
      });
    }
    
    res.json({ found: true, teacher: data });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ERROR HANDLING ==========

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ========== START SERVER ==========

app.listen(port, '0.0.0.0', () => {
  console.log(`
  ============================================
  🚀 TEACHER MANAGEMENT SERVER STARTED ON PORT ${port}
  ============================================
  
  ✅ AVAILABLE ENDPOINTS:
  
  TEACHER UPLOAD:
  POST /api/teachers/upload               - Upload teacher data
  
  STUDENT UPLOAD:
  POST /api/students/upload               - Upload student data
  
  TEACHER ACCOUNT MANAGEMENT (TEACHER-INVITE):
  POST /api/teacher-invite/invite         - Invite teacher with Resend email
  POST /api/teacher-invite/deactivate     - Deactivate teacher account
  POST /api/teacher-invite/reactivate     - Reactivate teacher account
  POST /api/teacher-invite/resend-invitation - Resend invitation
  POST /api/teacher-invite/delete-teacher - Delete teacher (INACTIVE only)
  GET  /api/teacher-invite/test           - Test endpoint
  GET  /api/teacher-invite/resend-status  - Check Resend configuration
  
  TEACHER ATTENDANCE:
  GET  /api/teacher-invite/get-teacher-id-by-auth
  GET  /api/teacher-invite/get-teacher-id-by-email
  GET  /api/teacher-invite/teacher-classes/:teacherId
  
  IPROG SMS:
  GET  /                         - Server status
  GET  /api/health              - Health check
  GET  /api/iproig/balance      - Check iProg info
  POST /api/attendance/sms      - Send attendance SMS
  POST /api/test-iproig-sms     - Test SMS
  
  DEBUG:
  GET  /api/debug/teacher/:id   - Check teacher by ID
  GET  /api/debug/find-teacher  - Find teacher by criteria
  
  📱 IPROG SMS FEATURES:
  • Instant SMS delivery in Philippines
  • Sender Name: ${process.env.IPROG_SENDER_ID || 'STO NINO'}
  • Cost: ₱0.30 per SMS
  • No verification needed for PH numbers
  
  ============================================
  `);
  
  // Configuration check
  console.log('🔧 Current Configuration:');
  console.log('IPROG_API_TOKEN:', process.env.IPROG_API_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('IPROG_SENDER_ID:', process.env.IPROG_SENDER_ID || 'STONINO (default)');
  console.log('SMS_ENABLED:', process.env.SMS_ENABLED === 'true' ? '✅ Yes' : '❌ No');
  console.log('Business Hours:', `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`);
  console.log('Rate Limit:', `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`);
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('');
  console.log('💡 Quick Test Teacher Upload:');
  console.log('curl -X POST http://localhost:5000/api/teachers/upload \\');
  console.log('  -F "file=@teachers.xlsx"');
});