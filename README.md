# Hair Transplant Clinic Platform

A multi-tenant SaaS platform for hair transplant clinics built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

- 🏥 Multi-tenant architecture with complete data isolation
- 🔐 Role-based access control (Owner, Doctor, Coordinator, Finance, Viewer)
- 🎨 Per-clinic theming with light/dark mode and glassmorphism UI
- 👥 Patient management with imaging and AI simulation
- 📊 Analytics dashboards with aggregated metrics
- 📅 Appointment scheduling with conflict detection
- 💰 Quote and proposal generation with PDF export
- 📧 Communication tracking (Email & SMS)
- 🔒 HIPAA-compliant security rules

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **State**: TanStack Query, Zustand
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- Firebase CLI

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Seed initial data (creates demo clinic with admin and doctor users):
```bash
pnpm seed
```

3. Start development server:
```bash
pnpm dev
```

### Test Credentials

After running the seed script:
- **Admin**: `admin@democlinic.com` / `Admin123!`
- **Doctor**: `doctor@democlinic.com` / `Doctor123!`

## Firebase Setup

The project is already configured for the Firebase project `transplant-35461`.

### Firestore Rules
Security rules are defined in `firestore.rules` and enforce:
- Tenant isolation
- Role-based access control
- Doctor can only access their patients
- Finance cannot access medical images

### Storage Rules
Storage rules in `storage.rules` protect:
- Patient media files (images)
- Proposal PDFs
- Tenant branding assets

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   ├── Layout.tsx   # Main layout with sidebar
│   └── ProtectedRoute.tsx
├── contexts/        # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── lib/             # Utilities and config
│   ├── firebase.ts  # Firebase initialization
│   └── utils.ts     # Helper functions
├── pages/           # Page components
│   ├── LoginPage.tsx
│   ├── ClinicSwitcher.tsx
│   └── Dashboard.tsx
├── types/           # TypeScript types
│   └── index.ts     # All data models
└── App.tsx          # Main app with routing
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm seed` - Seed database with test data
- `pnpm lint` - Run ESLint

## Firestore Data Model

Collections are nested under `tenants/{tenantId}`:
- `tenantMembers` - User roles and access
- `doctors` - Doctor profiles
- `patients` - Patient records
- `imagingSessions` - Before/after images
- `quotes` - Price quotes
- `proposals` - Sent proposals
- `appointments` - Calendar events
- `surgeryCases` - Surgery records
- `analyticsDaily` - Daily aggregates
- `analyticsDoctorDaily` - Per-doctor metrics

## Environment Variables

Copy `.env.example` to `.env` and configure:
- Firebase credentials (already set for dev)
- AI service API keys (when available)
- Email/SMS provider keys

## Next Steps

1. ✅ Basic authentication and tenant selection
2. ✅ Theme system with glassmorphism
3. ✅ Dashboard with role-based views
4. 🚧 Patient management pages
5. 🚧 Imaging and AI integration
6. 🚧 Quote and proposal workflow
7. 🚧 Calendar with scheduling
8. 🚧 Analytics with charts
9. 🚧 Cloud Functions for backend logic

## Security

- All Firestore and Storage rules enforce tenant isolation
- Role-based access control at database level
- PII encryption (to be implemented)
- Audit logging for compliance
- Finance role cannot access patient images

## License

Proprietary - All rights reserved
