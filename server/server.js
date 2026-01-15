import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';
import { sendAttendanceSMS, formatPhoneForSemaphore, checkSemaphoreBalance } from './services/semaphoreSmsService.js';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

app.get('/', async (req, res) => {
  const balance = await checkSemaphoreBalance();
  
  res.json({ 
    message: 'SEMAPHORE SMS SERVER RUNNING',
    timestamp: new Date().toISOString(),
    provider: 'Semaphore (Philippines)',
    instant: 'No Sender ID approval needed',
    cost: '₱0.60-₱0.80 per SMS',
    free_trial: '50 free credits on signup',
    sender_name: process.env.SEMAPHORE_SENDER_NAME || 'Semaphore',
    balance: balance ? `${balance.balance} credits` : 'Not configured',
    status: 'Ready for production'
  });
});

app.get('/api/health', async (req, res) => {
  const balance = await checkSemaphoreBalance();
  
  res.json({ 
    status: '✅ Server Healthy',
    timestamp: new Date().toISOString(),
    sms: {
      provider: 'Semaphore Philippines',
      configured: !!process.env.SEMAPHORE_API_KEY,
      enabled: process.env.SMS_ENABLED === 'true',
      business_hours: `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`,
      rate_limit: `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`,
      cost_per_sms: '₱0.60-₱0.80',
      sender_name: process.env.SEMAPHORE_SENDER_NAME || 'Semaphore',
      balance: balance ? `${balance.balance} credits` : 'N/A'
    },
    environment: process.env.NODE_ENV
  });
});

app.get('/api/semaphore/balance', async (req, res) => {
  try {
    const balance = await checkSemaphoreBalance();
    
    if (!balance) {
      return res.status(400).json({
        success: false,
        error: 'Semaphore not configured'
      });
    }
    
    res.json({
      success: true,
      provider: 'semaphore',
      balance: balance.balance,
      account: balance.name,
      email: balance.email,
      cost_per_sms: '1 credit',
      free_credits: '50 free credits on signup'
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
    
    console.log(`📨 Semaphore SMS request: student ${studentId}, ${scanType}`);
    
    const result = await sendAttendanceSMS(studentId, scanType);
    
    res.json({
      success: result.success,
      provider: result.provider,
      cost: result.cost,
      demo: result.demo || false,
      skipped: result.skipped || false,
      message: result.message
    });
    
  } catch (error) {
    console.error('❌ SMS endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/test-semaphore-sms', async (req, res) => {
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
    
    const message = `🏫 [SEMAPHORE TEST] Magandang araw ${guardianName}! Ito ay test message mula sa Semaphore SMS. Oras: ${phTime}, Petsa: ${phDate}.`;
    
    res.json({
      success: true,
      phone: testPhone,
      formatted: formatPhoneForSemaphore(testPhone),
      studentName,
      guardianName,
      message_preview: message.substring(0, 60) + '...',
      provider: 'semaphore',
      cost: '₱0.60-₱0.80 per SMS',
      sender: process.env.SEMAPHORE_SENDER_NAME || 'Semaphore',
      instant: 'Works instantly in Philippines',
      free_credits: '50 free credits on signup',
      endpoint: 'POST https://api.semaphore.co/api/v4/messages'
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Simple webhook for testing
app.post('/api/webhooks/attendance', async (req, res) => {
  try {
    const { student_id, scan_type } = req.body;
    
    if (student_id && scan_type) {
      console.log(`🤖 Auto-SMS for student ${student_id}, ${scan_type}`);
      
      // Send async
      sendAttendanceSMS(student_id, scan_type)
        .then(result => {
          console.log(`🤖 Auto-SMS result: ${result.success ? '✅' : '❌'}`);
        })
        .catch(err => {
          console.error('🤖 Auto-SMS error:', err);
        });
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`
  ============================================
  🚀 SEMAPHORE SMS SERVER STARTED ON PORT ${port}
  ============================================
  
  ✅ FEATURES:
  • Instant SMS delivery (no approval wait)
  • Sender Name: ${process.env.SEMAPHORE_SENDER_NAME || 'Semaphore'}
  • Cost: ₱0.60-₱0.80 per SMS (cheaper!)
  • FREE: 50 credits on signup
  
  📱 SMS PROVIDER:
  • Semaphore Philippines (semaphore.co)
  • No Sender ID approval needed
  • Works instantly in PH
  • High delivery rates
  
  🔗 AVAILABLE ENDPOINTS:
  GET  /                     - Server status
  GET  /api/health           - Health check
  GET  /api/semaphore/balance - Check credits
  POST /api/attendance/sms   - Send attendance SMS
  POST /api/test-semaphore-sms - Test Semaphore SMS
  
  💰 PRICING:
  • ~₱0.60-₱0.80 per SMS
  • 50 FREE credits on signup
  • No monthly fees
  
  🎓 READY FOR:
  • Capstone defense TODAY
  • Real SMS delivery
  • Production deployment
  
  ============================================
  `);
  
  console.log('🔧 Configuration:');
  console.log('SEMAPHORE_API_KEY:', process.env.SEMAPHORE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('SENDER_NAME:', process.env.SEMAPHORE_SENDER_NAME || 'Semaphore (default)');
  console.log('SMS_ENABLED:', process.env.SMS_ENABLED === 'true' ? '✅ Yes' : '❌ No');
  console.log('Business Hours:', `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`);
  console.log('Rate Limit:', `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`);
});