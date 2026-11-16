# NexaServe — Restaurant Management System

## Start (Windows)
1. Extract the ZIP.
2. Install Node.js 18 or newer from https://nodejs.org/ if needed.
3. Double-click `START.bat`.
4. Wait for setup and open http://localhost:5173.

No `.env`, MongoDB account, Compass, or manual database configuration is required. The backend starts MongoDB automatically using `mongodb-memory-server` and stores database files in `server/data`. First launch needs internet for npm packages and the MongoDB binary. Keep the launcher window open.

## Demo accounts
- Admin: `admin@nexaserve.local` / `Admin@123`
- Staff: `staff@nexaserve.local` / `Staff@123`
- Customer: `customer@nexaserve.local` / `Customer@123`

## Features
React + Vite frontend; Express/Node API; MongoDB; JWT login; customer registration, menu, cart and order history; staff order queue, status updates and billing; admin dashboard and menu CRUD; responsive navy/white/electric-blue design.

API health: http://localhost:5000/api/health

Academic/demo use. Replace the development JWT secret and add production security before deployment.
