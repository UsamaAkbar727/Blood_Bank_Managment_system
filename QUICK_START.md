# Blood Bank Management System - Quick Start Guide

## 🚀 Installation & Startup Instructions

### Step 1: Start XAMPP Services
1. Open **XAMPP Control Panel**
2. Click **Start** for **Apache**
3. Click **Start** for **MySQL**
4. Wait until both show "Running" status

### Step 2: Install Database
1. Open your web browser
2. Navigate to: `http://localhost/Blood%20Bank%20Management%20System/install.php`
3. Wait for installation to complete (should take 5-10 seconds)
4. You should see a success message

### Step 3: Access the Application
You have two options:

#### Option A: Direct Access (Recommended)
Navigate to: `http://localhost/Blood%20Bank%20Management%20System/`

This will show the welcome page with links to:
- Install the system (if not already done)
- Launch the application
- View system status

#### Option B: Direct App Access
Navigate to: `http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html`

### Step 4: Login
Use the default credentials:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **IMPORTANT:** Change these credentials immediately after first login!

---

## 🧪 Testing the System

### Test API Endpoints
Visit: `http://localhost/Blood%20Bank%20Management%20System/api/test.php`

This will show:
- ✅ Database connection status
- ✅ All database tables
- ✅ Admin user existence
- ✅ All required files and services

### Test Login Flow
1. Go to: `http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html`
2. Enter username: `admin`
3. Enter password: `admin123`
4. Click "Login"
5. You should be redirected to the Dashboard

---

## 📁 Project Structure

```
Blood Bank Management System/
│
├── index.html                 ← Welcome/Landing page
├── install.php                ← Database installation script
├── SETUP_GUIDE.md            ← Detailed setup documentation
├── QUICK_START.md            ← This file
│
├── api/                      ← Backend API endpoints
│   ├── auth/                 ← Login, Logout, Current User
│   ├── donors/               ← Donor management
│   ├── collections/          ← Blood collection
│   ├── inventory/            ← Blood inventory
│   ├── patients/             ← Patient management
│   ├── issuance/             ← Blood issuance
│   ├── finance/              ← Billing & expenses
│   ├── reports/              ← Reports
│   ├── logs/                 ← System logs
│   ├── notifications/        ← Notifications
│   ├── backups/              ← Database backups
│   ├── alerts/               ← Alerts (expiry, shortage)
│   ├── screening/            ← Blood screening
│   └── test.php              ← API test endpoint
│
├── backend/                  ← Business logic
│   ├── lib/                  ← Service classes
│   │   ├── Auth.php          ← Authentication
│   │   ├── DonorService.php
│   │   ├── CollectionService.php
│   │   ├── InventoryService.php
│   │   ├── PatientService.php
│   │   ├── IssuanceService.php
│   │   ├── FinancialService.php
│   │   ├── ScreeningService.php
│   │   ├── ReportService.php
│   │   ├── LogService.php
│   │   ├── NotificationService.php
│   │   ├── BackupService.php
│   │   ├── AlertService.php
│   │   ├── SmsService.php
│   │   └── Permissions.php
│   ├── config.php            ← Configuration
│   └── db.php               ← Database connection
│
├── frontend/                 ← React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   ├── dist/                ← Production build
│   │   ├── index.html
│   │   └── assets/
│   ├── package.json
│   └── vite.config.js
│
└── database/
    └── schema.sql           ← Database schema
```

---

## 🔧 Troubleshooting

### Problem: Apache Won't Start
**Solution:**
1. Close Skype (if running)
2. Check if port 80 is in use
3. Try changing Apache port to 8080 in XAMPP config

### Problem: MySQL Won't Start
**Solution:**
1. Check if port 3306 is in use
2. Try changing MySQL port in XAMPP config
3. Restart your computer and try again

### Problem: Login Fails / "Invalid Credentials"
**Solution:**
1. Make sure you ran `install.php` first
2. Check browser console for errors (F12)
3. Clear browser cache and cookies
4. Verify admin user exists in database:
   ```sql
   SELECT * FROM users WHERE username = 'admin';
   ```

### Problem: Page Shows Blank/White Screen
**Solution:**
1. Check browser console for JavaScript errors (F12)
2. Verify all files in `frontend/dist/assets/` exist
3. Rebuild frontend: 
   ```bash
   cd frontend
   npm run build
   ```

### Problem: API Errors (404, 500)
**Solution:**
1. Visit `/api/test.php` to diagnose
2. Check PHP error log: `xampp/apache/logs/error.log`
3. Verify database connection in `backend/config.php`

### Problem: Session/Login Issues
**Solution:**
1. Ensure cookies are enabled in browser
2. Try incognito/private browsing mode
3. Clear browser cache and cookies
4. Check that sessions are working:
   - Create a test file: `test_session.php`
   - Add: `<?php session_start(); echo session_id(); ?>`

---

## 🎯 Key Features

✅ **User Management**
- Admin and Staff roles
- Role-based access control
- Session management

✅ **Donor Management**
- Donor registration
- Donation history tracking
- Eligibility checking

✅ **Blood Collection**
- Collection recording
- Bag type selection (350ml/450ml)
- Collection site tracking

✅ **Screening & Testing**
- Disease screening (HBsAg, HCV, HIV, Malaria, Syphilis)
- Blood group confirmation
- Result tracking

✅ **Inventory Management**
- Blood component tracking
- Expiry date monitoring
- Stock level alerts

✅ **Patient Management**
- Patient registration
- Blood group tracking
- Treatment history

✅ **Blood Issuance**
- Cross-matching records
- Units issued tracking
- Return processing

✅ **Financial Management**
- Billing & invoicing
- Expense tracking
- Pricing management

✅ **Reports & Analytics**
- Collection reports
- Inventory reports
- Usage statistics

✅ **System Features**
- Activity logging
- Notifications
- Database backups
- SMS alerts (configurable)

---

## 🔐 Security Recommendations

1. **After Installation:**
   - Delete or rename `install.php`
   - Change default admin password
   - Update database credentials in `backend/config.php`

2. **For Production:**
   - Enable HTTPS
   - Use strong database passwords
   - Set proper file permissions
   - Disable error display in PHP
   - Enable regular backups

3. **Regular Maintenance:**
   - Monitor disk space
   - Review activity logs
   - Update dependencies
   - Backup database regularly

---

## 📞 Support & Help

If you encounter issues:

1. **Check Documentation:**
   - Read `SETUP_GUIDE.md` for detailed instructions
   - Review this `QUICK_START.md`

2. **Run Diagnostics:**
   - Visit `/api/test.php`
   - Check browser console (F12)
   - Review PHP error logs

3. **Common Commands:**
   ```bash
   # Rebuild frontend
   cd frontend
   npm install
   npm run build
   
   # Test database connection
   # Visit: http://localhost/Blood%20Bank%20Management%20System/api/test.php
   ```

---

## 🎉 Success Checklist

- [ ] XAMPP Apache is running
- [ ] XAMPP MySQL is running
- [ ] Database installed via `install.php`
- [ ] Can access welcome page at `http://localhost/Blood%20Bank%20Management%20System/`
- [ ] Can access app at `http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html`
- [ ] Can login with admin/admin123
- [ ] Dashboard loads correctly
- [ ] API test page shows all green checks

If all boxes are checked, you're ready to use the Blood Bank Management System! 🎊
