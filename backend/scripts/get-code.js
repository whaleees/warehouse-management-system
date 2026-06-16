// Dev helper: print the email verification code stored in Redis.
// Resend is off in local dev, so the code is never emailed — but auth.service
// writes it to Redis (key `verify_code:<email>`, 10-min TTL) before sending,
// so it's always readable here.
//
// Usage (run from the backend folder):
//   node scripts/get-code.js you@example.com   -> code for one email
//   node scripts/get-code.js                   -> list every pending code
require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const email = process.argv[2];

(async () => {
  try {
    if (email) {
      const key = `verify_code:${email}`;
      const code = await redis.get(key);
      if (code) {
        const ttl = await redis.ttl(key);
        console.log(`\n  ${email}\n  code: ${code}   (expires in ${ttl}s)\n`);
      } else {
        console.log(
          `\n  No code for "${email}".\n  Either it was never registered, the email differs, or it expired (10-min TTL).\n`,
        );
      }
    } else {
      const keys = await redis.keys('verify_code:*');
      if (!keys.length) {
        console.log('\n  No pending verification codes.\n');
      } else {
        console.log('\n  Pending verification codes:');
        for (const k of keys) {
          const code = await redis.get(k);
          const ttl = await redis.ttl(k);
          console.log(`    ${k.replace('verify_code:', '')}  ->  ${code}  (${ttl}s left)`);
        }
        console.log('');
      }
    }
  } catch (err) {
    console.error('Failed to read from Redis:', err.message);
    process.exitCode = 1;
  } finally {
    redis.quit();
  }
})();
