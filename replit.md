# EquineWatch (Stable Eye)

## Overview
Premium equine health monitoring application through continuous photographic observation. Built with React, TypeScript, and Vite.

## Project Architecture
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS with various plugins (forms, typography, animations)
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM
- **Additional Libraries**: 
  - Framer Motion for animations
  - Recharts for data visualization
  - Leaflet/React-Leaflet for maps
  - Axios for HTTP requests
  - Lucide React for icons

## Project Structure
```
src/
├── components/       # Reusable UI components
│   └── ui/          # Base UI components (Button, Input, etc.)
├── contexts/        # React contexts (Theme, Auth)
├── hooks/           # Custom hooks
├── pages/           # Page components
│   ├── add-observation/
│   ├── daily-summary/
│   ├── horse-list/
│   ├── horse-timeline/
│   ├── landing/     # Public landing page (homepage)
│   ├── login/
│   ├── profile/
│   ├── devices/     # Hardware devices (stable owner/admin only)
│   ├── bills/       # Billing history (stable owner/admin only)
│   ├── admin/       # Admin dashboard & stables (admin only)
│   └── world-map/
├── styles/          # CSS files
└── utils/           # Utility functions
public/              # Static assets
```

## Routes
- `/` - Public landing page (Hero, Problem, How It Works, Features, Use Cases, AI Technology, Testimonials, Comparison, FAQ, Team, CTA)
- `/login` - Login page (entry to the app)
- `/daily-summary` - Colic Monitoring dashboard
- `/horse-timeline` - Live Monitoring with photos
- `/horse-list` - Horse list/Horses page
- `/world-map` - World Map view
- `/profile` - User profile
- `/devices` - Hardware devices page (stable owner/admin only)
- `/bills` - Billing history (stable owner/admin only)
- `/admin` - Admin dashboard with user management (admin only)
- `/admin/stables` - View all stables (admin only)

## User Roles
The app supports 3 user types with different access levels:

### Horse Owner (horse_owner)
- Access: Horses, Timeline, Insights, Profile
- Login: owner@equinewatch.com / owner123

### Stable Owner (stable_owner)
- Access: Everything horse owner has + Devices + Bills
- Login: stable@equinewatch.com / stable123

### Admin (admin)
- Access: Everything + Admin Dashboard + All Stables + User Management
- Login: admin@equinewatch.com / admin123

## Development Setup
- **Port**: 5000
- **Host**: 0.0.0.0 (configured for Replit proxy)
- **Start Command**: `npm run start`
- **Build Command**: `npm run build`

## Deployment
- Uses Vite preview server for production
- Build outputs to `build/` directory
