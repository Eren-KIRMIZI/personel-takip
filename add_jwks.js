const { execSync } = require('child_process');

const jwks = JSON.stringify({
  keys: [{
    x: "GkSMcN7ebxZy7mjo_fPSPw8lk5ctdh2eNQYEBvZJ3C0",
    y: "YjcKQz50PK3MjMnGYKhyG3_v0Mp6bNi0yMIFKLKXhQw",
    alg: "ES256",
    crv: "P-256",
    ext: true,
    kid: "0dbd2063-4685-4404-83b5-bddac1c66a6b",
    kty: "EC",
    key_ops: ["verify"]
  }]
});

console.log('Adding SUPABASE_JWT_JWKS value:', jwks.substring(0, 50) + '...');

try { execSync('vercel env rm SUPABASE_JWT_JWKS production --yes', { stdio: 'inherit' }); } catch (e) { /* ignore */ }

execSync('vercel env add SUPABASE_JWT_JWKS production', {
  input: jwks,
  stdio: ['pipe', 'inherit', 'inherit']
});

console.log('Done!');
