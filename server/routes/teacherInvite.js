// routes/teacherInvite.js - COMPLETE VERSION
import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Resend API Key
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Function to send email via Resend
async function sendResendEmail(email, firstName, tempPassword) {
  try {
    console.log(`📤 Sending Resend email to: ${email}`);
    
    if (!RESEND_API_KEY || RESEND_API_KEY === 'your_resend_api_key') {
      console.error('❌ Resend API key not configured');
      return { success: false, error: 'Resend API key not configured' };
    }
    
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'School Management System <onboarding@resend.dev>',
        to: [email],
        subject: 'Your Teacher Account Login Details',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Teacher Account</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 20px 0; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .password { font-size: 20px; font-weight: bold; color: #dc3545; background: #fff5f5; padding: 10px; border-radius: 5px; display: inline-block; margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Welcome to School Management System! 🎓</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Teacher Account Invitation</p>
              </div>
              <div class="content">
                <p>Hello <strong>${firstName}</strong>,</p>
                
                <p>Your teacher account has been created successfully. Here are your login credentials:</p>
                
                <div class="credentials">
                  <h3 style="margin-top: 0; color: #3B82F6;">Your Login Details</h3>
                  <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Temporary Password:</strong></p>
                  <div class="password">${tempPassword}</div>
                </div>
                
                <p><strong>To get started:</strong></p>
                <ol>
                  <li>Click the button below or go to: <a href="${loginUrl}">${loginUrl}</a></li>
                  <li>Enter your email: <strong>${email}</strong></li>
                  <li>Enter the temporary password shown above</li>
                  <li>Start using your teacher dashboard!</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" class="button">Login to Your Account</a>
                </div>
                
                <div class="footer">
                  <p><strong>Important:</strong> Keep your password secure. Contact admin if you need to reset it.</p>
                  <p>If you didn't expect this invitation, please contact the school administration.</p>
                  <p>Best regards,<br><strong>School Management System</strong></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hello ${firstName},

Your teacher account has been created successfully!

LOGIN DETAILS:
Login URL: ${loginUrl}
Email: ${email}
Temporary Password: ${tempPassword}

INSTRUCTIONS:
1. Go to: ${loginUrl}
2. Enter your email: ${email}
3. Enter temporary password: ${tempPassword}
4. Start using your teacher dashboard!

Keep your password secure. Contact admin if you need to reset it.

If you didn't expect this invitation, please contact the school administration.

Best regards,
School Management System`
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resend API error:', response.status, errorText);
      return { success: false, error: `Resend API error: ${response.status}`, details: errorText };
    }
    
    const data = await response.json();
    console.log('✅ Resend email sent:', data);
    return { success: true, data: data };
    
  } catch (error) {
    console.error('❌ Resend error:', error);
    return { success: false, error: error.message };
  }
}

// Create user in public.users table
async function createUserInPublicTable(authUserId, email, firstName, lastName, invitedBy) {
  try {
    // Generate username from email
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    
    const userData = {
      user_id: authUserId,
      username: username,
      role: 'teacher',
      email: email,
      first_name: firstName,
      last_name: lastName,
      status: 'invited',
      invited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('👤 Creating user in public.users table:', userData);
    
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating user in public.users:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User created in public.users:', data);
    return { success: true, data: data };
    
  } catch (error) {
    console.error('❌ Error in createUserInPublicTable:', error);
    return { success: false, error: error.message };
  }
}

// MAIN INVITE ENDPOINT WITH RESEND
router.post('/invite', async (req, res) => {
  console.log('🚀 INVITE WITH RESEND');
  
  try {
    const { teacherId, invitedBy } = req.body;

    if (!teacherId || !invitedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // 1. Get teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    console.log(`👤 Teacher: ${teacher.first_name} ${teacher.last_name}`);

    if (!teacher.email_address) {
      return res.status(400).json({ success: false, error: 'No email address' });
    }

    if (teacher.status === 'active' || teacher.status === 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Teacher already ${teacher.status}` 
      });
    }

    // 2. Generate password
    const tempPassword = `teacher${Math.floor(100 + Math.random() * 900)}`;
    console.log(`🔑 Password: ${tempPassword}`);

    // 3. CREATE ACCOUNT IN SUPABASE AUTH
    let authUserId = null;
    
    // Check if user already exists in Auth
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = allUsers.users.find(u => u.email === teacher.email_address);
    
    if (existingUser) {
      // User exists, update password
      authUserId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: tempPassword,
        user_metadata: {
          ...existingUser.user_metadata,
          temp_password: tempPassword,
          first_name: teacher.first_name,
          last_name: teacher.last_name
        }
      });
      console.log('🔁 Updated existing Auth user:', authUserId);
    } else {
      // Create new Auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: teacher.email_address,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          temp_password: tempPassword,
          role: 'teacher'
        }
      });
      
      if (authError) {
        console.error('❌ Auth user creation error:', authError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create authentication account',
          details: authError.message 
        });
      }
      
      authUserId = authUser.user.id;
      console.log('✅ Created new Auth user:', authUserId);
    }

    // 4. CREATE USER IN public.users TABLE
    const userResult = await createUserInPublicTable(
      authUserId,
      teacher.email_address,
      teacher.first_name,
      teacher.last_name,
      invitedBy
    );
    
    if (!userResult.success) {
      console.error('⚠️ Failed to create user in public.users, but continuing with teacher update');
    }

    // 5. SEND EMAIL VIA RESEND
    console.log(`📤 Sending email via Resend to: ${teacher.email_address}`);
    const emailResult = await sendResendEmail(
      teacher.email_address,
      teacher.first_name,
      tempPassword
    );

    // 6. Update teacher table
    const { error: updateError } = await supabase
      .from('teachers')
      .update({
        status: 'pending',
        invited_at: new Date().toISOString(),
        invited_by: invitedBy,
        temp_password: tempPassword,
        auth_user_id: authUserId,
        updated_at: new Date().toISOString(),
        email_provider: 'resend',
        email_sent: emailResult.success
      })
      .eq('id', teacherId);

    if (updateError) {
      console.error('❌ Error updating teacher:', updateError);
      // Don't fail completely, just log the error
    }

    console.log(`✅ Teacher updated. Email sent: ${emailResult.success}`);
    
    // 7. Response
    const response = {
      success: true,
      teacherId: teacher.id,
      teacherName: `${teacher.first_name} ${teacher.last_name}`,
      email: teacher.email_address,
      tempPassword: tempPassword,
      emailSent: emailResult.success,
      emailProvider: 'Resend.com',
      accountCreated: true,
      userId: authUserId,
      status: 'pending',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`,
      message: emailResult.success 
        ? '✅ EMAIL SENT SUCCESSFULLY VIA RESEND.COM! Teacher should receive it immediately.'
        : '❌ Email failed via Resend. Share credentials manually.',
      credentials: {
        email: teacher.email_address,
        password: tempPassword,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`
      }
    };
    
    if (!emailResult.success) {
      response.emailError = emailResult.error;
      response.fallbackInstructions = 'Share these credentials manually with the teacher:';
    }
    
    res.json(response);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NEW: Accept invitation endpoint - updates status to active
router.post('/accept-invitation', async (req, res) => {
  console.log('✅ TEACHER ACCEPTING INVITATION');
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    console.log(`Updating status for: ${email}`);
    
    // Update teacher status to active
    const { error: teacherError } = await supabase
      .from('teachers')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email_address', email);
    
    if (teacherError) {
      console.error('❌ Error updating teacher status:', teacherError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update teacher status',
        details: teacherError.message 
      });
    }
    
    // Update users table status
    const { error: userError } = await supabase
      .from('users')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (userError) {
      console.error('⚠️ Error updating users table:', userError);
      // Continue anyway since teacher update succeeded
    }
    
    console.log(`✅ Successfully updated ${email} to active status`);
    
    res.json({
      success: true,
      message: 'Account activated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Resend endpoint
router.post('/test-resend', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    console.log(`🧪 Testing Resend with: ${email}`);
    
    const testResult = await sendResendEmail(
      email,
      name || 'Test User',
      'test123456'
    );
    
    res.json({
      success: testResult.success,
      email: email,
      result: testResult,
      note: testResult.success 
        ? '✅ Email sent via Resend! Check inbox.'
        : '❌ Resend failed: ' + (testResult.error || 'Unknown')
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Check Resend configuration
router.get('/resend-status', (req, res) => {
  const hasApiKey = !!RESEND_API_KEY && RESEND_API_KEY !== 'your_resend_api_key';
  
  res.json({
    success: true,
    resendConfigured: hasApiKey,
    apiKeyLength: RESEND_API_KEY?.length || 0,
    note: hasApiKey 
      ? '✅ Resend API key configured'
      : '❌ Resend API key not configured in .env file',
    instructions: hasApiKey 
      ? ['Ready to send emails via Resend']
      : [
          '1. Sign up at resend.com (free)',
          '2. Get API key from dashboard',
          '3. Add to .env: RESEND_API_KEY=your_key',
          '4. Restart server'
        ]
  });
});

export default router;