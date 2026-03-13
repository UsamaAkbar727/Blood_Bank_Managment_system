# 🏥 Blood Bank Management System - Complete Installation Guide

## Welcome! 👋

Thank you for choosing the Blood Bank Management System. This guide will help you get the system up and running in just a few minutes.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **XAMPP** installed (includes PHP 8.0+ and MySQL 8.0+)
- ✅ **Node.js 16+** (optional, only if rebuilding frontend)
- ✅ Modern web browser (Chrome, Firefox, Edge)
- ✅ Internet connection (for fonts and CDN resources)

### XAMPP Download
If you haven't installed XAMPP yet:
1. Visit: https://www.apachefriends.org/
2. Download the latest version for Windows
3. Install to default location: `C:\xampp`

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start XAMPP Services ⏱️ 30 seconds

1. Open **XAMPP Control Panel**
2. Click **Start** button for **Apache**
3. Click **Start** button for **MySQL**
4. Wait until both show green "Running" status

✅ Apache should be running on Port 80  
✅ MySQL should be running on Port 3306

---

### Step 2: Access the Project ⏱️ 10 seconds

Open your web browser and navigate to:

```
http://localhost/Blood%20Bank%20Management%20System/
```

You should see the welcome page with a purple gradient background.

🎉 **If you see the welcome page**, the web server is configured correctly!

---

### Step 3: Install Database ⏱️ 1 minute

1. On the welcome page, click **"🚀 Install System"** button
   - OR directly visit: `http://localhost/Blood%20Bank%20Management%20System/install.php`

2. The installation wizard will:
   - ✅ Check PHP version
   - ✅ Verify MySQL extension
   - ✅ Connect to MySQL server
   - ✅ Create database
   - ✅ Import schema (13 tables)
   - ✅ Create default admin user
   - ✅ Insert sample pricing data

3. Wait for the success message: **"Installation Completed Successfully!"**

---

### Step 4: Launch Application ⏱️ 10 seconds

From the welcome page or installation success page, click:

**"📱 Launch App"** button

OR navigate to:
```
http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html
```

---

### Step 5: Login ⏱️ 10 seconds

Use the default credentials:

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin123` |

Click **"Login"** button.

✅ You should be redirected to the **Dashboard** page.

---

## 🎉 Congratulations! System is Ready!

You can now:
- ✅ View dashboard statistics
- ✅ Manage donors
- ✅ Track blood collections
- ✅ Manage inventory
- ✅ Process patient requests
- ✅ Generate reports
- ✅ And much more!

---

## 🔍 Verification Steps

### Verify Database Installation

Visit: `http://localhost/Blood%20Bank%20Management%20System/test-db.php`

You should see:
- ✅ All configuration loaded
- ✅ MySQL connection successful
- ✅ Database exists
- ✅ All 13 tables created
- ✅ Admin user exists

### Verify API Endpoints

Visit: `http://localhost/Blood%20Bank%20Management%20System/api/test.php`

Expected output:
```json
{
  "summary": {
    "total_errors": 0,
    "status": "All tests passed"
  }
}
```

### Test Login Flow

1. Go to application
2. Login with admin/admin123
3. Navigate through different modules
4. Check if data loads correctly

---

## 📁 What Was Installed?

### Database Tables (13 total)

1. **users** - Staff/admin accounts
2. **donors** - Blood donor records
3. **collections** - Blood collection records
4. **screening_tests** - Blood screening results
5. **inventory** - Blood bank inventory
6. **patients** - Patient records
7. **blood_issuance** - Blood issuance tracking
8. **logs** - System activity logs
9. **expenses** - Expense tracking
10. **blood_pricing** - Blood component pricing
11. **billing_records** - Billing and invoices
12. **notifications** - In-app notifications
13. **backup_logs** - Database backup history

### Default User Account

- **Username:** admin
- **Password:** admin123
- **Role:** admin
- **Status:** active

⚠️ **IMPORTANT:** Change this password immediately after first login!

---

## 🛠️ Troubleshooting

### Problem: Apache Won't Start

**Symptoms:**
- Apache shows "Port 80 in use" error
- Apache starts then stops immediately

**Solutions:**

1. **Close Skype** (if running)
   - Skype uses port 80 by default
   
2. **Change Apache Port:**
   - In XAMPP Control Panel, click "Config" for Apache
   - Change "Listen 80" to "Listen 8080"
   - Update URL to: `http://localhost:8080/Blood%20Bank%20Management%20System/`

3. **Check what's using port 80:**
   ```cmd
   netstat -ano | findstr :80
   ```

---

### Problem: MySQL Won't Start

**Symptoms:**
- MySQL shows "Port 3306 in use" error
- MySQL service fails to start

**Solutions:**

1. **Restart Computer** - Simple but effective!

2. **Change MySQL Port:**
   - In XAMPP, click "Config" for MySQL
   - Change port from 3306 to 3307
   - Update `backend/config.php` with new port

3. **Check existing MySQL installations:**
   - Uninstall other MySQL instances
   - Or change their ports

---

### Problem: Can't Access Welcome Page

**Error: 404 Not Found**

**Solutions:**

1. **Verify folder location:**
   - Ensure folder is at: `C:\xampp\htdocs\Blood Bank Management System`
   - Check folder name spelling (including spaces)

2. **Check Apache is running:**
   - Green "Running" status in XAMPP
   
3. **Try direct path:**
   ```
   http://127.0.0.1/Blood%20Bank%20Management%20System/
   ```

---

### Problem: Installation Fails

**Error: Database connection failed**

**Solutions:**

1. **Verify MySQL is running:**
   - Check XAMPP Control Panel
   
2. **Test MySQL connection:**
   - Open phpMyAdmin: `http://localhost/phpmyadmin`
   - If this works, MySQL is running

3. **Check credentials:**
   - Open `backend/config.php`
   - Verify DB_USER is 'root'
   - Verify DB_PASS is empty (default XAMPP)

---

### Problem: Login Doesn't Work

**Error: "Invalid credentials" or login fails**

**Solutions:**

1. **Ensure install.php was run:**
   - Run installation if not done
   - Check for success message

2. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear cookies and cache
   - Try incognito/private mode

3. **Verify admin user exists:**
   ```sql
   SELECT * FROM users WHERE username = 'admin';
   ```
   
4. **Reset admin password:**
   ```sql
   UPDATE users 
   SET password_hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
   WHERE username = 'admin';
   ```
   This sets password to: `password`

---

### Problem: Blank White Screen

**Frontend shows blank page**

**Solutions:**

1. **Check browser console:**
   - Press F12
   - Look for JavaScript errors
   - Share error messages

2. **Verify build exists:**
   - Check `frontend/dist/assets/` folder
   - Should contain .js and .css files

3. **Rebuild frontend:**
   ```bash
   cd C:\xampp\htdocs\Blood Bank Management System\frontend
   npm install
   npm run build
   ```

---

### Problem: API Errors (404/500)

**API endpoints not working**

**Solutions:**

1. **Run API test:**
   ```
   http://localhost/Blood%20Bank%20Management%20System/api/test.php
   ```

2. **Check PHP error log:**
   - Location: `C:\xampp\apache\logs\error.log`
   - Look for recent errors

3. **Verify file permissions:**
   - Ensure all PHP files are readable
   - Check .htaccess files exist

---

## 🔐 Security Best Practices

### Immediate Actions (Do These First!)

1. ✅ **Change default admin password**
   - Login as admin
   - Go to Settings/Profile
   - Change password immediately

2. ✅ **Delete installation files**
   ```
   Delete: install.php
   Delete: test-db.php
   ```

3. ✅ **Update database credentials**
   - Edit `backend/config.php`
   - Set strong database password
   - Update DB_PASS constant

### Production Deployment

When deploying to production server:

1. **Enable HTTPS**
   - Get SSL certificate
   - Force HTTPS redirects
   - Update SESSION_SECURE to true

2. **Set File Permissions**
   - CHMOD 755 for directories
   - CHMOD 644 for files
   - Restrict access to config files

3. **Disable Error Display**
   ```php
   // In php.ini or config
   display_errors = Off
   error_reporting = E_ALL
   ```

4. **Regular Backups**
   - Use built-in backup feature
   - Schedule daily backups
   - Store backups off-site

---

## 📚 System Features Overview

### Modules Available

1. **Dashboard** 📊
   - Real-time statistics
   - Recent activities
   - Quick actions

2. **Donor Management** 👥
   - Donor registration
   - Donation history
   - Eligibility tracking

3. **Collections** 🩸
   - Record new collections
   - Track collection sites
   - Bag type selection

4. **Screening** 🔬
   - Disease testing
   - Blood group confirmation
   - Result management

5. **Inventory** 📦
   - Stock management
   - Expiry tracking
   - Component tracking

6. **Patients** 🏥
   - Patient registration
   - Treatment history
   - Blood group records

7. **Issuance** 📤
   - Blood issue tracking
   - Cross-matching
   - Return processing

8. **Finance** 💰
   - Billing & invoicing
   - Expense tracking
   - Pricing management

9. **Reports** 📈
   - Collection reports
   - Inventory reports
   - Usage analytics

10. **Logs** 📝
    - Activity logs
    - System events
    - Audit trail

11. **Notifications** 🔔
    - Alerts
    - Reminders
    - Updates

12. **Backups** 💾
    - Database backups
    - Backup scheduling
    - Restore functionality

---

## 🆘 Getting Help

### Diagnostic Tools

1. **Welcome Page**
   - System status check
   - Quick links

2. **Database Test**
   - `test-db.php`
   - Comprehensive DB check

3. **API Test**
   - `/api/test.php`
   - All endpoints check

### Information to Gather

When seeking help, provide:

1. **System Info:**
   - XAMPP version
   - PHP version
   - MySQL version

2. **Error Messages:**
   - Browser console errors (F12)
   - PHP error logs
   - Specific error text

3. **Steps Taken:**
   - What were you trying to do?
   - What steps did you follow?
   - When did the error occur?

---

## 🎓 Next Steps

After successful installation:

1. ✅ **Explore the Dashboard**
   - Navigate through all modules
   - Understand the layout
   - Check sample data

2. ✅ **Create Additional Users**
   - Add staff members
   - Assign appropriate roles
   - Set permissions

3. ✅ **Configure System Settings**
   - Update pricing
   - Configure alerts
   - Set up SMS gateway (optional)

4. ✅ **Enter Real Data**
   - Add donor records
   - Create patient profiles
   - Track inventory

5. ✅ **Train Staff**
   - Show login process
   - Demonstrate key features
   - Review security practices

---

## 📞 Support Resources

### Documentation Files

- `QUICK_START.md` - Quick reference guide
- `SETUP_GUIDE.md` - Detailed setup instructions
- `README.md` - Project overview

### Useful URLs

- Main Application: `/frontend/dist/index.html`
- API Test: `/api/test.php`
- Database Test: `/test-db.php`
- Installation: `/install.php`

---

## ✨ Tips for Success

1. **Always backup before making changes**
2. **Test in development before production**
3. **Keep XAMPP updated**
4. **Monitor disk space**
5. **Review logs regularly**
6. **Train all users properly**
7. **Follow security best practices**
8. **Document customizations**

---

## 🎉 You're All Set!

Your Blood Bank Management System is now ready to use. Start by logging in and exploring the features. Remember to change the default password and configure the system according to your needs.

**Happy managing!** 🏥💉

---

*Last Updated: March 11, 2026*  
*Version: 1.0.0*
