/**
 * Admin Seed Script using Firebase Admin SDK
 * This bypasses security rules to create initial data
 * 
 * SETUP:
 * 1. Go to: https://console.firebase.google.com/project/transplant-35461/settings/serviceaccounts/adminsdk
 * 2. Click "Generate new private key"
 * 3. Save as serviceAccountKey.json in the project root
 * 
 * Run with: pnpm seed:admin
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Try to load service account key
let credential;
const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  credential = admin.credential.cert(serviceAccount);
  console.log('✅ Using service account from serviceAccountKey.json\n');
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log('✅ Using GOOGLE_APPLICATION_CREDENTIALS\n');
} else {
  console.error('❌ ERROR: No Firebase Admin credentials found!\n');
  console.error('Please download your service account key:');
  console.error('1. Go to: https://console.firebase.google.com/project/transplant-35461/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save as "serviceAccountKey.json" in the project root\n');
  process.exit(1);
}

// Initialize Firebase Admin
const app = admin.initializeApp({
  credential,
  projectId: 'transplant-35461',
});

const auth = admin.auth(app);
const db = admin.firestore(app);

// Light green accent color as requested
const ACCENT_COLOR = '#22c55e'; // Tailwind green-500

const defaultTheme = {
  accentColor: ACCENT_COLOR,
  lightMode: {
    primary: '142 76% 36%',
    primaryForeground: '0 0% 100%',
    secondary: '210 40% 96.1%',
    secondaryForeground: '222.2 47.4% 11.2%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    card: '0 0% 100%',
    cardForeground: '222.2 84% 4.9%',
    muted: '210 40% 96.1%',
    mutedForeground: '215.4 16.3% 46.9%',
    accent: '142 76% 36%',
    accentForeground: '0 0% 100%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 100%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '142 76% 36%',
  },
  darkMode: {
    primary: '142 76% 36%',
    primaryForeground: '0 0% 100%',
    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '0 0% 100%',
    background: '222.2 84% 4.9%',
    foreground: '0 0% 100%',
    card: '222.2 84% 4.9%',
    cardForeground: '0 0% 100%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    accent: '142 76% 36%',
    accentForeground: '0 0% 100%',
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '0 0% 100%',
    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '142 76% 36%',
  },
};

async function seed() {
  console.log('🌱 Starting admin seed script...\n');

  try {
    const tenantId = 'green-valley-clinic';
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Create tenant
    console.log('📦 Creating tenant: Green Valley Hair Clinic');
    await db.collection('tenants').doc(tenantId).set({
      name: 'Green Valley Hair Clinic',
      slug: 'green-valley-clinic',
      themeObject: defaultTheme,
      emailFrom: 'noreply@greenvalley.com',
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log('✅ Tenant created\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@greenvalley.com';
    const adminPassword = 'Admin123!';
    
    let adminUser;
    try {
      adminUser = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'Admin User',
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  Admin user already exists, fetching...');
        adminUser = await auth.getUserByEmail(adminEmail);
      } else {
        throw error;
      }
    }

    const adminUserId = adminUser.uid;

    await db.collection('usersPublic').doc(adminUserId).set({
      displayName: 'Admin User',
      email: adminEmail,
      createdAt: now,
    });

    await db.collection('tenants').doc(tenantId).collection('tenantMembers').doc(adminUserId).set({
      userId: adminUserId,
      tenantId,
      role: 'OWNER',
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Set custom claims for admin
    await auth.setCustomUserClaims(adminUserId, {
      tenants: {
        [tenantId]: {
          role: 'OWNER',
          active: true,
        }
      }
    });

    console.log('✅ Admin user created');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);

    // Create doctor user
    console.log('👨‍⚕️ Creating doctor user...');
    const doctorEmail = 'dr.smith@greenvalley.com';
    const doctorPassword = 'Doctor123!';
    
    let doctorUser;
    try {
      doctorUser = await auth.createUser({
        email: doctorEmail,
        password: doctorPassword,
        displayName: 'Dr. Smith',
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  Doctor user already exists, fetching...');
        doctorUser = await auth.getUserByEmail(doctorEmail);
      } else {
        throw error;
      }
    }

    const doctorUserId = doctorUser.uid;

    await db.collection('usersPublic').doc(doctorUserId).set({
      displayName: 'Dr. Smith',
      email: doctorEmail,
      createdAt: now,
    });

    const doctorProfileId = `doctor-${doctorUserId}`;
    await db.collection('tenants').doc(tenantId).collection('doctors').doc(doctorProfileId).set({
      tenantId,
      userId: doctorUserId,
      licenseNo: 'MD-12345',
      specialties: ['Hair Transplant', 'Cosmetic Surgery'],
      active: true,
      capacity: 40,
      createdAt: now,
      updatedAt: now,
    });

    await db.collection('tenants').doc(tenantId).collection('tenantMembers').doc(doctorUserId).set({
      userId: doctorUserId,
      tenantId,
      role: 'DOCTOR',
      active: true,
      doctorProfileId,
      createdAt: now,
      updatedAt: now,
    });

    // Set custom claims for doctor
    await auth.setCustomUserClaims(doctorUserId, {
      tenants: {
        [tenantId]: {
          role: 'DOCTOR',
          active: true,
          doctorProfileId,
        }
      }
    });

    console.log('✅ Doctor user created');
    console.log(`   Email: ${doctorEmail}`);
    console.log(`   Password: ${doctorPassword}\n`);

    // Create sample patients
    console.log('👥 Creating sample patients...');
    
    const patients = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        age: 35,
        gender: 'male',
        status: 'new-lead',
        funnelStage: 'lead',
        leadSource: 'website',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1 (555) 234-5678',
        age: 42,
        gender: 'female',
        status: 'consulted',
        funnelStage: 'CONSULTED',
        leadSource: 'referral',
      },
      {
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'michael.j@example.com',
        phone: '+1 (555) 345-6789',
        age: 28,
        gender: 'male',
        status: 'quoted',
        funnelStage: 'PROPOSAL_SENT',
        leadSource: 'google-ads',
      },
    ];

    for (const patient of patients) {
      const patientId = `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.collection('tenants').doc(tenantId).collection('patients').doc(patientId).set({
        ...patient,
        tenantId,
        primaryDoctorId: doctorUserId,
        sharedCare: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`✅ Created ${patients.length} sample patients\n`);

    console.log('🎉 Seed completed successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📱 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════');
    console.log(`\n🔐 Admin:`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`\n👨‍⚕️  Doctor:`);
    console.log(`   Email:    ${doctorEmail}`);
    console.log(`   Password: ${doctorPassword}`);
    console.log(`\n🌐 Login at: http://localhost:3001/`);
    console.log('═══════════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('❌ Error during seeding:', error);
    console.error('\nError details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }

  process.exit(0);
}

seed();
