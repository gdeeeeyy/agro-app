// Simple script to create the default admin account
const { createDefaultAdmin } = require('../lib/createAdmin');

async function main() {
  console.log('Creating default admin account...');
  try {
    await createDefaultAdmin();
    console.log('Admin creation process completed!');
  } catch (error) {
    console.error('Failed to create admin:', error);
  }
}

main();