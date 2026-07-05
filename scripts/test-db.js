import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Just test basic connection
    await prisma.$connect();
    console.log('✅ Connected!');
    
    // Simple query that works everywhere
    const result = await prisma.$queryRaw`SELECT 1+1 as sum, current_timestamp as time`;
    console.log('✅ Result:', result);
    
    await prisma.$disconnect();
    console.log('✅ Test passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();