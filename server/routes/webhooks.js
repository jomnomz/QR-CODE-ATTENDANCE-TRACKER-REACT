import express from 'express';
import { supabase } from '../config/supabase.js'; 

const router = express.Router();

router.post('/auth', async (req, res) => {
  try {
    const { type, user } = req.body;

    if (type === 'user.updated' || type === 'user.signedup') {
      const userEmail = user.email;
      
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