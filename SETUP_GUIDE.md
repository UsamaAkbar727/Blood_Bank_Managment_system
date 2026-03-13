# Blood Bank Management System - Setup Guide

## Quick Start

### Prerequisites
- XAMPP (PHP 8.0+, MySQL 8.0+, Apache)
- Node.js 16+ (optional, for frontend development)

### Installation Steps

#### 1. Database Setup
1. Start XAMPP Control Panel
2. Start Apache and MySQL servers
3. Open browser and navigate to:
   ```
   http://localhost/Blood%20Bank%20Management%20System/install.php
   ```
4. Follow the installation wizard
5. Default login credentials:
   - **Username:** admin
   - **Password:** admin123

#### 2. Frontend Setup (Development Mode)

If you want to run the frontend in development mode with hot-reload:

```bash
cd "c:\xampp\htdocs\Blood Bank Management System\frontend"
npm install
npm run dev
```

Then access the app at: `http://localhost:5173`

#### 3. Production Build

The frontend is already built in `frontend/dist/`. You can access it directly at:
```
http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html
```

Or rebuild if needed:

```bash
cd "c:\xampp\htdocs\Blood Bank Management System\frontend"
npm run build
```

## Testing the Installation

After installation, verify everything works:

### 1. Test API Endpoints
Visit: `http://localhost/Blood%20Bank%20Management%20System/api/test.php`

This will show:
- Database connection status
- Table existence
- Admin user status
- All required files

### 2. Test Login
1. Navigate to: `http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html`
2. Login with:
   - Username: admin
   - Password: admin123

## Project Structure

```
Blood Bank Management System/
├── api/                    # Backend API endpoints
│   ├── auth/              # Authentication (login, logout, me)
│   ├── donors/            # Donor management
│   ├── collections/       # Blood collection
│   ├── inventory/         # Blood inventory
│   ├── patients/          # Patient management
│   ├── issuance/          # Blood issuance
│   ├── finance/           # Billing and expenses
│   ├── reports/           # Reports generation
│   ├── logs/              # System logs
│   ├── notifications/     # Notifications
│   ├── backups/           # Database backups
│   ├── alerts/            # Alerts (expiry, shortage)
│   └── screening/         # Blood screening
├── backend/               # Backend business logic
│   ├── lib/              # Service classes
│   │   ├── Auth.php
│   │   ├── DonorService.php
│   │   ├── InventoryService.php
│   │   └── ... (other services)
│   ├── config.php        # Configuration
│   └── db.php           # Database connection
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── dist/            # Production build
├── database/            # Database schema
│   └── schema.sql
├── install.php         # Installation script
└── .htaccess          # Apache configuration
```

## Features

- ✅ User Authentication (Admin/Staff roles)
- ✅ Donor Management
- ✅ Blood Collection Tracking
- ✅ Blood Screening & Testing
- ✅ Inventory Management
- ✅ Blood Issuance to Patients
- ✅ Billing & Invoicing
- ✅ Expense Tracking
- ✅ Reports & Analytics
- ✅ Notifications & Alerts
- ✅ Activity Logs
- ✅ Database Backups

## Default Credentials

**IMPORTANT:** Change these immediately after first login!

- **Username:** admin
- **Password:** admin123

## Troubleshooting

### Login Not Working
1. Ensure Apache and MySQL are running in XAMPP
2. Run `install.php` to create the admin user
3. Check browser console for errors
4. Verify session cookies are enabled

### API Errors
1. Check PHP error log in `xampp/apache/logs/error.log`
2. Verify database connection in `backend/config.php`
3. Run the test endpoint: `/api/test.php`

### Frontend Not Loading
1. Clear browser cache
2. Rebuild frontend: `npm run build`
3. Check that all assets are in `frontend/dist/assets/`

## Security Notes

- Delete or rename `install.php` after successful installation
- Change default admin password immediately
- Enable HTTPS in production
- Update `backend/config.php` with strong database credentials
- Set proper file permissions on production server

## Support

For issues or questions, check:
1. API test endpoint: `/api/test.php`
2. Browser console for JavaScript errors
3. PHP error logs in XAMPP
