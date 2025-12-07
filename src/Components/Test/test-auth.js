// test-auth.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testAdminAccess() {
  console.log('🧪 Testing Supabase Admin Access...');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
  
  try {
    // Test 1: List users (admin only)
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Cannot list users (not admin):', usersError.message);
      
      // Test 2: Try to create a user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'test@example.com',
        email_confirm: true,
        password: 'TestPassword123!'
      });
      
      if (createError) {
        console.error('❌ Cannot create user:', createError.message);
        console.error('\n💡 SOLUTION: Check your service role key!');
        console.error('1. Go to: Supabase Dashboard → Settings → API');
        console.error('2. Copy the "service_role" secret (starts with eyJ...)');
        console.error('3. Update your .env file');
        console.error('4. Make sure it has "service_role" not "anon"');
      } else {
        console.log('✅ Can create users');
      }
    } else {
      console.log('✅ Admin access confirmed! Can list users');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminAccess();