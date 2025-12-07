import express from 'express';
import cors from 'cors';
import studentUploadRoutes from './routes/studentUpload.js';
import teacherUploadRoutes from './routes/teacherUpload.js';
import teacherInviteRoutes from './routes/teacherInvite.js';
import { supabase } from './config/supabase.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add debugging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Mount student routes
app.use('/api/students', studentUploadRoutes);

// Mount teacher upload routes
app.use('/api/teachers', teacherUploadRoutes);

// Mount teacher invitation routes
app.use('/api/teacher-invite', teacherInviteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Webhook route
app.post('/api/webhooks/auth', async (req, res) => {
  try {
    const { type, user } = req.body;
    console.log('📧 Webhook received:', type, 'for user:', user?.email);
    
    if (type === 'user.updated' || type === 'user.signedup' || type === 'user.confirmed') {
      const userEmail = user.email;
      
      console.log(`🔄 Updating status for: ${userEmail}`);
      
      // Update teacher status to active
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          status: 'active',
          auth_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('email_address', userEmail);

      if (teacherError) {
        console.error('❌ Error updating teacher status:', teacherError);
      } else {
        console.log(`✅ Updated teacher ${userEmail} to active`);
      }
      
      // Update users table status
      try {
        const { error: userError } = await supabase
          .from('users')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('email', userEmail);
          
        if (userError) {
          console.error('❌ Error updating users table:', userError);
        } else {
          console.log(`✅ Updated user ${userEmail} to active in users table`);
        }
      } catch (usersError) {
        console.error('❌ Error with users table:', usersError.message);
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});



app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log('📚 Available endpoints:');
  console.log(`   GET  /`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/students/upload`);
  console.log(`   POST /api/teachers/upload`);
  console.log(`   GET  /api/teachers/health`);
  console.log(`   POST /api/teacher-invite/invite`);
  console.log(`   POST /api/teacher-invite/invite/bulk`);
  console.log(`   POST /api/webhooks/auth`);
  
  // Debug environment
  console.log('\n🔧 Environment check:');
  console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
});