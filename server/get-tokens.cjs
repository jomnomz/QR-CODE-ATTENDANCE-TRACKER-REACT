// get-tokens.js
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== GET REAL ZOHO TOKENS ===\n');

rl.question('Enter your ZOHO_CLIENT_ID: ', (clientId) => {
  console.log('\n🔗 OPEN THIS URL IN BROWSER:');
  console.log(`https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=http://localhost:5000/zoho-callback&prompt=consent`);
  
  rl.question('\nPaste the CODE from URL (after ?code=): ', (code) => {
    rl.question('Enter your ZOHO_CLIENT_SECRET: ', async (clientSecret) => {
      try {
        const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: 'http://localhost:5000/zoho-callback',
            grant_type: 'authorization_code'
          })
        });
        
        const data = await response.json();
        console.log('\n✅ YOUR REAL TOKENS:');
        console.log('================================');
        console.log(`ZOHO_CLIENT_ID=${clientId}`);
        console.log(`ZOHO_CLIENT_SECRET=${clientSecret}`);
        console.log(`ZOHO_REFRESH_TOKEN=${data.refresh_token}`);
        console.log(`ZOHO_ACCESS_TOKEN=${data.access_token}`);
        console.log('================================');
        console.log('\n📋 Copy these to your .env file!');
        
      } catch (error) {
        console.error('❌ Error:', error);
      }
      
      rl.close();
    });
  });
});