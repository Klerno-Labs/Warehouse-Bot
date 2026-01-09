/**
 * Script to set a user as Super Admin
 * Usage: npx tsx scripts/set-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'c.hatfield309@gmail.com';

async function setSuperAdmin() {
  try {
    console.log(`Setting ${SUPER_ADMIN_EMAIL} as Super Admin...`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_EMAIL },
    });

    if (!user) {
      console.error(`❌ User with email ${SUPER_ADMIN_EMAIL} not found`);
      console.log('Please create this user account first');
      process.exit(1);
    }

    // Update user to Super Admin
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'SuperAdmin',
        isSuperAdmin: true,
      },
    });

    console.log('✅ Success!');
    console.log(`User: ${updated.firstName} ${updated.lastName}`);
    console.log(`Email: ${updated.email}`);
    console.log(`Role: ${updated.role}`);
    console.log(`Super Admin: ${updated.isSuperAdmin}`);
    console.log('\nYou now have full platform access to manage all tenants!');
  } catch (error) {
    console.error('Error setting super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setSuperAdmin();
