// routes/webhooks.js
import express from 'express';
import { supabase } from '../config/supabase'; 

const router = express.Router();

// This should be configured in Supabase Auth → URL Configuration
// Set SITE_URL to your frontend URL and add /api/webhooks/auth as the redirect

router.post('/auth', async (req, res) => {
  try {
    const { type, user } = req.body;

    if (type === 'user.updated' || type === 'user.signedup') {
      const userEmail = user.email;
      
      // Update teacher status to active when user confirms/creates account
      const { error } = await supabase
        .from('teachers')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('email_address', userEmail);

      if (error) {
        console.error('Error updating teacher status:', error);
      }

      // Update users table status
      await supabase
        .from('users')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;