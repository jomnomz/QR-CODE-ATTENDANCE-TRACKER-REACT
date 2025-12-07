import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function ConfirmInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (type === 'invite' && token) {
      // You would verify the token with your backend
      setStatus('success');
      
      // Redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } else {
      setStatus('error');
    }
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Verifying your invitation...</h2>
        <p>Please wait while we confirm your invitation.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>🎉 Invitation Accepted!</h2>
        <p>Your teacher account has been successfully created.</p>
        <p>You will be redirected to the login page shortly.</p>
        <p>Please use the email you received the invitation on to log in.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>❌ Invalid Invitation</h2>
      <p>The invitation link is invalid or has expired.</p>
      <p>Please contact your school administrator for a new invitation.</p>
    </div>
  );
}

export default ConfirmInvitation;