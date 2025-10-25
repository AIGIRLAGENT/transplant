# Quick Start - Automated Setup

## Step 1: Download Service Account Key

1. Go to [Firebase Console - Service Accounts](https://console.firebase.google.com/project/transplant-35461/settings/serviceaccounts/adminsdk)
2. Click **"Generate new private key"**
3. Save the file as `serviceAccountKey.json` in the project root (d:\Transplant\)

## Step 2: Run Seed Script

```powershell
pnpm seed:admin
```

This will automatically create:
- ✅ Tenant: "Green Valley Hair Clinic"
- ✅ Admin user: `admin@greenvalley.com` / `Admin123!`
- ✅ Doctor user: `dr.smith@greenvalley.com` / `Doctor123!`
- ✅ 3 Sample patients

## Step 3: Login

Open http://localhost:3001/ and login with:

**Admin:**
- Email: `admin@greenvalley.com`
- Password: `Admin123!`

**Doctor:**
- Email: `dr.smith@greenvalley.com`
- Password: `Doctor123!`

---

## That's it! 🎉

The seed script uses Firebase Admin SDK to bypass security rules and create data directly.
