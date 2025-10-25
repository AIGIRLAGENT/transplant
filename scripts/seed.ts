/**
 * Seed script to create initial tenant and users for testing
 * 
 * Run with: pnpm seed
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { ThemeObject, Tenant, TenantMember, UserPublic, Doctor } from '../src/types';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCoyFYejvtWzSH2_PDwJ0JZUEn68uE-pIM",
  authDomain: "transplant-35461.firebaseapp.com",
  projectId: "transplant-35461",
  storageBucket: "transplant-35461.appspot.com",
  messagingSenderId: "305267939101",
  appId: "1:305267939101:web:4b5606d26077dda696b3f4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Light green accent color as requested
const ACCENT_COLOR = '#22c55e'; // Tailwind green-500

const defaultTheme: ThemeObject = {
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
  console.log('🌱 Starting seed script...\n');

  try {
    // Create tenant
    const tenantId = 'demo-clinic';
    const tenant: Omit<Tenant, 'id'> = {
      name: 'Demo Hair Clinic',
      slug: 'demo-clinic',
      themeObject: defaultTheme,
      emailFrom: 'noreply@democlinic.com',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('📦 Creating tenant:', tenant.name);
    await setDoc(doc(db, 'tenants', tenantId), tenant);
    console.log('✅ Tenant created\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@democlinic.com';
    const adminPassword = 'Admin123!';
    
    const adminUserCredential = await createUserWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword
    );
    const adminUserId = adminUserCredential.user.uid;

    const adminPublic: Omit<UserPublic, 'id'> = {
      displayName: 'Admin User',
      email: adminEmail,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'usersPublic', adminUserId), adminPublic);

    const adminMember: Omit<TenantMember, 'id'> = {
      userId: adminUserId,
      tenantId,
      role: 'OWNER',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, `tenants/${tenantId}/tenantMembers`, adminUserId), adminMember);
    console.log('✅ Admin user created');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);

    // Sign out admin to create doctor
    await auth.signOut();

    // Create doctor user
    console.log('👨‍⚕️ Creating doctor user...');
    const doctorEmail = 'doctor@democlinic.com';
    const doctorPassword = 'Doctor123!';
    
    const doctorUserCredential = await createUserWithEmailAndPassword(
      auth,
      doctorEmail,
      doctorPassword
    );
    const doctorUserId = doctorUserCredential.user.uid;

    const doctorPublic: Omit<UserPublic, 'id'> = {
      displayName: 'Dr. Smith',
      email: doctorEmail,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'usersPublic', doctorUserId), doctorPublic);

    const doctorProfileId = `doctor-${doctorUserId}`;
    const doctorProfile: Omit<Doctor, 'id'> = {
      tenantId,
      userId: doctorUserId,
      licenseNo: 'MD-12345',
      specialties: ['Hair Transplant', 'Cosmetic Surgery'],
      active: true,
      capacity: 40,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, `tenants/${tenantId}/doctors`, doctorProfileId), doctorProfile);

    const doctorMember: Omit<TenantMember, 'id'> = {
      userId: doctorUserId,
      tenantId,
      role: 'DOCTOR',
      active: true,
      doctorProfileId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, `tenants/${tenantId}/tenantMembers`, doctorUserId), doctorMember);
    console.log('✅ Doctor user created');
    console.log(`   Email: ${doctorEmail}`);
    console.log(`   Password: ${doctorPassword}\n`);

    console.log('🎉 Seed completed successfully!\n');
    console.log('You can now login with:');
    console.log(`  Admin:  ${adminEmail} / ${adminPassword}`);
    console.log(`  Doctor: ${doctorEmail} / ${doctorPassword}`);
    
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.error('❌ Error: Users already exist. Seed script has likely been run before.');
      console.log('\nTo re-seed, you need to:');
      console.log('1. Delete users from Firebase Authentication console');
      console.log('2. Delete tenant data from Firestore console');
      console.log('3. Run this script again\n');
    } else {
      console.error('❌ Error during seeding:', error);
    }
    process.exit(1);
  }

  process.exit(0);
}

seed();
