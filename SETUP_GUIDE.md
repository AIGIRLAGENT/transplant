# Initial Setup Guide

Since Firestore rules prevent unauthenticated writes, we need to manually create the first users and tenant through the Firebase Console.

## Step 1: Enable Authentication

1. Go to [Firebase Console - Authentication](https://console.firebase.google.com/project/transplant-35461/authentication/providers)
2. Click on **"Email/Password"** provider
3. Click **"Enable"**
4. Save

## Step 2: Create First Admin User

1. Go to [Firebase Console - Authentication - Users](https://console.firebase.google.com/project/transplant-35461/authentication/users)
2. Click **"Add User"**
3. Enter:
   - **Email**: `admin@greenvalley.com`
   - **Password**: `Admin123!`
4. Click **"Add User"**
5. **Copy the User UID** (you'll need this in the next steps)

## Step 3: Create Tenant in Firestore

1. Go to [Firebase Console - Firestore](https://console.firebase.google.com/project/transplant-35461/firestore)
2. Click **"+ Start Collection"**
3. Collection ID: `tenants`
4. Document ID: `green-valley-clinic`
5. Add these fields:

```
name: "Green Valley Hair Clinic" (string)
slug: "green-valley-clinic" (string)
active: true (boolean)
emailFrom: "noreply@greenvalley.com" (string)
createdAt: <use "timestamp" and current time>
updatedAt: <use "timestamp" and current time>
themeObject: {
  accentColor: "#22c55e",
  lightMode: {
    primary: "142 76% 36%",
    primaryForeground: "0 0% 100%",
    accent: "142 76% 36%",
    accentForeground: "0 0% 100%",
    background: "0 0% 100%",
    foreground: "222.2 84% 4.9%"
  },
  darkMode: {
    primary: "142 76% 36%",
    primaryForeground: "0 0% 100%",
    accent: "142 76% 36%",
    accentForeground: "0 0% 100%",
    background: "222.2 84% 4.9%",
    foreground: "0 0% 100%"
  }
} (map)
```

6. Click **"Save"**

## Step 4: Create User Profile in usersPublic

1. Still in Firestore, click **"+ Start Collection"** (at root level)
2. Collection ID: `usersPublic`
3. Document ID: **[Paste the User UID from Step 2]**
4. Add fields:

```
displayName: "Admin User" (string)
email: "admin@greenvalley.com" (string)
createdAt: <timestamp - current time>
```

5. Click **"Save"**

## Step 5: Create Tenant Member

1. Navigate to: `tenants/green-valley-clinic`
2. Click **"+ Start Collection"** (subcollection)
3. Collection ID: `tenantMembers`
4. Document ID: **[Same User UID from Step 2]**
5. Add fields:

```
userId: "[Your User UID]" (string)
tenantId: "green-valley-clinic" (string)
role: "OWNER" (string)
active: true (boolean)
createdAt: <timestamp>
updatedAt: <timestamp>
```

6. Click **"Save"**

## Step 6: Test Login

1. Open the app: http://localhost:3000
2. Login with:
   - **Email**: `admin@greenvalley.com`
   - **Password**: `Admin123!`
3. You should see the dashboard!

---

## Alternative: Automated Seed (For Future Tenants)

Once you have the first admin user, you can create an admin panel to add new tenants and users programmatically. The seed script won't work for the *first* tenant because of the security rules chicken-and-egg problem.

## Create a Doctor User (Optional)

Repeat Step 2-5 with:
- **Email**: `dr.smith@greenvalley.com`
- **Password**: `Doctor123!`
- **Role**: `DOCTOR` (instead of OWNER)
- Add field `doctorProfileId`: `doctor-[UID]`
- Also create a document in `tenants/green-valley-clinic/doctors/doctor-[UID]` with fields:
  ```
  userId: "[Doctor UID]"
  tenantId: "green-valley-clinic"
  licenseNo: "MD-12345"
  specialties: ["Hair Transplant"] (array)
  active: true
  capacity: 40 (number)
  createdAt: <timestamp>
  updatedAt: <timestamp>
  ```

---

## Quick Reference

**Tenant ID**: `green-valley-clinic`  
**Admin Email**: `admin@greenvalley.com`  
**Admin Password**: `Admin123!`  
**Accent Color**: `#22c55e` (light green)

**Firebase Console Links**:
- [Authentication](https://console.firebase.google.com/project/transplant-35461/authentication/users)
- [Firestore](https://console.firebase.google.com/project/transplant-35461/firestore)
- [Storage](https://console.firebase.google.com/project/transplant-35461/storage)
