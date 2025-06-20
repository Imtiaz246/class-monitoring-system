#!/usr/bin/env bun

import { db, users } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { eq } from 'drizzle-orm';

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating Super Admin...');

    // Check if super admin already exists
    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existingSuperAdmin) {
      console.log('❌ Super Admin already exists!');
      console.log(`📧 Email: ${existingSuperAdmin.email}`);
      process.exit(1);
    }

    // Get environment variables
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME || 'Super Administrator';

    if (!email || !password) {
      console.log('❌ Missing required environment variables:');
      console.log('   - SUPER_ADMIN_EMAIL');
      console.log('   - SUPER_ADMIN_PASSWORD');
      console.log('   - SUPER_ADMIN_NAME (optional)');
      process.exit(1);
    }

    // Validate password length
    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    // Check if user with email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      console.log(`❌ User with email ${email} already exists!`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = jwtAuth.hashPassword(password);

    // Create super admin
    const [newSuperAdmin] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        role: 'super_admin',
        emailVerified: true, // Super admin is auto-verified
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    console.log('✅ Super Admin created successfully!');
    console.log(`📧 Email: ${newSuperAdmin.email}`);
    console.log(`👤 Name: ${newSuperAdmin.name}`);
    console.log(`🆔 ID: ${newSuperAdmin.id}`);
    console.log('');
    console.log('🔐 You can now login with the provided credentials.');
    console.log('🌐 Use the login endpoint: POST /api/auth/login');
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
createSuperAdmin();