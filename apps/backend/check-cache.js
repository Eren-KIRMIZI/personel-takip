const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: 'https://REDACTED.upstash.io',
  token: 'REDACTED_UPSTASH_TOKEN',
});

async function run() {
  try {
    console.log('Connecting to Upstash Redis...');
    
    // Check if we can ping the database
    const ping = await redis.ping();
    console.log('Ping Response:', ping);

    // List all keys to see if the app has cached anything
    const keys = await redis.keys('*');
    console.log('Total keys in cache:', keys.length);
    if (keys.length > 0) {
      console.log('Keys:', keys);
    } else {
      console.log('Cache is empty right now. Log in to the application to generate cache data.');
    }
    
  } catch (error) {
    console.error('Failed to connect or fetch from Redis:', error.message);
  }
}

run();
