# 🔧 Login & Installation Troubleshooting Guide

## Issues Fixed ✅

### 1. Duplicate Key Error (FIXED)
**Error:** `Duplicate key name 'idx_collections_donor_date'`

**Cause:** Schema was partially imported before (tables/indexes already exist)

**Solution:** Updated install.php to ignore duplicate errors and treat them as success

---

### 2. Login Failing with 401 Unauthorized (FIXED)
**Error:** `POST /api/auth/login.php 401 (Unauthorized)`

**Causes:**
- Admin user doesn't exist in database
- Database tables not created properly
- Password not hashed correctly

**Solution:** Fixed admin user creation order in install.php

---

## 🚀 How to Fix Your Current Issue

You have **two options**:

---

### Option 1: Quick Fix - Just Create Admin User ⭐ RECOMMENDED

If your database tables exist but login fails:

1. **Open phpMyAdmin:**
   ```
   http://localhost/phpmyadmin
   ```

2. **Select your database:**
   - Click on `blood bank management system` in left sidebar

3. **Run this SQL:**
   ```sql
   INSERT INTO users (name, username, phone, role, password_hash, status) 
   VALUES ('Administrator', 'admin', '+1234567890', 'admin', 
   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active');
   ```

4. **Test Login:**
   - Username: `admin`
   - Password: `admin123`

✅ **Done!** You should be able to login now.

---

### Option 2: Complete Fresh Start

If you want to reset everything:

#### Step 1: Reset Database
Visit:
```
http://localhost/Blood%20Bank%20Management%20System/reset-database.php
```

Click "Yes, Reset Everything"

#### Step 2: Run Installation
After reset completes, visit:
```
http://localhost/Blood%20Bank%20Management%20System/install.php
```

Wait for success message.

#### Step 3: Test Login
```
Username: admin
Password: admin123
```

---

## 🔍 Diagnosing the Problem

### Check if Tables Exist

Visit:
```
http://localhost/Blood%20Bank%20Management%20System/test-db.php
```

Look for:
- ✅ All 13 tables should show "Exists"
- ✅ Row counts should display
- ✅ Admin user should exist

### Check API Status

Visit:
```
http://localhost/Blood%20Bank%20Management%20System/api/test.php
```

Should show:
```json
{
  "summary": {
    "total_errors": 0,
    "status": "All tests passed"
  }
}
```

### Manual Database Check

In phpMyAdmin, run:
```sql
USE `blood bank management system`;
SHOW TABLES;
```

You should see 13 tables.

Then check if admin exists:
```sql
SELECT * FROM users WHERE username = 'admin';
```

If no results, admin user wasn't created.

---

## 🛠️ Manual Fixes

### Fix 1: Create Admin User Manually

If tables exist but login fails:

```sql
-- In phpMyAdmin, run this:
INSERT INTO users (name, username, phone, role, password_hash, status) 
VALUES (
  'Administrator',
  'admin',
  '+1234567890',
  'admin',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'active'
);
```

This creates admin with password: `admin123`

### Fix 2: Reset Admin Password

If admin exists but password doesn't work:

```sql
UPDATE users 
SET password_hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE username = 'admin';
```

This resets password to: `admin123`

### Fix 3: Drop and Recreate Database

Via phpMyAdmin:

```sql
DROP DATABASE IF EXISTS `blood bank management system`;
CREATE DATABASE `blood bank management system` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

Then run `install.php` again.

---

## ✅ Verification Steps

After any fix, verify:

### 1. Database Test
```
http://localhost/Blood%20Bank%20Management%20System/test-db.php
```
Should show all green checkmarks.

### 2. API Test
```
http://localhost/Blood%20Bank%20Management%20System/api/test.php
```
Should show 0 errors.

### 3. Login Test
```
http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html
```
Login with admin/admin123 should work.

---

## 📋 Common Error Messages & Solutions

### Error: "Table 'users' doesn't exist"
**Solution:** Run install.php to create tables

### Error: "Duplicate key name"
**Solution:** Already fixed in updated install.php - just run it again

### Error: "Access denied for user 'root'"
**Solution:** Check MySQL is running in XAMPP

### Error: "Can't connect to MySQL server"
**Solution:** Start MySQL in XAMPP Control Panel

### Error: Login returns 401
**Solution:** Admin user doesn't exist - create manually or run install.php

### Error: "Duplicate entry 'admin' for key 'username'"
**Solution:** Admin already exists - just try logging in

---

## 🎯 What Was Fixed in Your Files

### install.php Changes:

1. **Fixed backtick escaping:**
   ```php
   // Before (wrong):
   \`$db_name\`
   
   // After (correct):
   `$db_name`
   ```

2. **Added duplicate error handling:**
   ```php
   $skip_errors = ['Duplicate key name', 'Table already exists', 'Duplicate entry'];
   ```
   Now ignores "already exists" errors and treats them as success.

3. **Fixed admin user creation order:**
   ```php
   // Variable defined BEFORE bind_param
   $admin_user = 'admin';
   $stmt->bind_param("ssssss", $name, $admin_user, ...);
   ```

---

## 🔐 Default Credentials

Remember:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change these immediately after first login!**

---

## 📞 Still Having Issues?

### Step-by-Step Debug:

1. **Check XAMPP:**
   - Apache running? ✓
   - MySQL running? ✓

2. **Check Database:**
   - Open phpMyAdmin
   - Does `blood bank management system` exist? ✓
   - Does it have 13 tables? ✓

3. **Check Admin User:**
   ```sql
   SELECT * FROM users WHERE username = 'admin';
   ```
   Should return 1 row ✓

4. **Check API:**
   ```
   Visit: /api/test.php
   ```
   Should show 0 errors ✓

5. **Clear Browser Cache:**
   - Press Ctrl+Shift+Delete
   - Clear everything
   - Try incognito mode

6. **Try Different Browser:**
   - Sometimes browser extensions interfere

---

## 🎉 Success Indicators

You'll know everything works when:

✅ test-db.php shows all tables  
✅ api/test.php shows 0 errors  
✅ Can access login page  
✅ Login accepts admin/admin123  
✅ Redirects to dashboard  
✅ No console errors (F12)  

---

## 💡 Prevention Tips

To avoid these issues in future:

1. **Always use install.php** for initial setup
2. **Don't run schema.sql manually** (let install.php handle it)
3. **Use reset-database.php** if you need fresh start
4. **Keep backups** via phpMyAdmin export
5. **Check test-db.php** after any changes

---

**Your system should work now!** Try the quick fix (Option 1) first. 🚀

*Last Updated: March 11, 2026*
