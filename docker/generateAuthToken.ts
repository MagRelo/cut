import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
}

async function generateAuthToken(userId: string) {
  try {
    // First, verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
      },
    });

    if (!user) {
      console.error(`User with ID ${userId} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Generate JWT token with the same structure as the auth system
    const token = jwt.sign(
      { userId: user.id } as JwtPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '180d' }
    );

    console.log('\n=== AUTH TOKEN ===');
    console.log(token);
    console.log('==================\n');

    console.log('To use this token in the browser:');
    console.log('1. Open browser developer tools (F12)');
    console.log('2. Go to Application/Storage tab');
    console.log('3. Find Local Storage for your domain');
    console.log('4. Add a new key: "token"');
    console.log('5. Set the value to the token above');
    console.log('6. Refresh the page');

    console.log('\nOr you can run this in the browser console:');
    console.log(`localStorage.setItem('token', '${token}');`);
    console.log('location.reload();');
  } catch (error) {
    console.error('Error generating auth token:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Please provide a user ID as an argument');
    console.error('Usage: npm run generate-auth-token <userId>');
    console.error('\nTo find a user ID, you can:');
    console.error('1. Check the database directly');
    console.error('2. Use the admin panel if available');
    console.error('3. Look at existing user records');
    process.exit(1);
  }

  generateAuthToken(userId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to generate auth token:', error);
      process.exit(1);
    });
}

export { generateAuthToken };
