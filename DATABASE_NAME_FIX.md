# 🔧 Database Name Fix - Quick Solution

## Problem Solved ✅

The error was caused by a mismatch between the database name in the configuration and your actual MySQL database name.

### What Was Fixed

1. **Fixed backtick escaping** in `install.php` - Changed from escaped backticks (\`) to proper backticks (`)
2. **Updated config.php** - Changed database name to match your actual database: `blood bank management system` (lowercase)

---

## ✅ Try Installation Again

Now you can run the installation:

```
http://localhost/Blood%20Bank%20Management%20System/install.php
```

It should work now! 🎉

---

## 📝 Understanding the Issue

### The Problem

MySQL/MariaDB is **case-sensitive** with database names on some systems (especially Linux). Your actual database was created as:

```
blood bank management system  (all lowercase)
```

But the config had:

```
Blood Bank Management System  (with capital letters)
```

### Why Backticks Matter

Database names with spaces need to be wrapped in backticks in SQL:

```sql
-- Correct:
CREATE DATABASE `blood bank management system`;

-- Incorrect (causes syntax error):
CREATE DATABASE \`blood bank management system\`;
```

The install script had escaped backticks which caused the syntax error.

---

## 🔍 Verify Your Database Name

To check your actual database name, open phpMyAdmin:

```
http://localhost/phpmyadmin
```

Look at the left sidebar - you'll see your database name exactly as it exists in MySQL.

---

## 🛠️ Alternative Solutions (If Needed)

### Option 1: Rename Your Database

If you want to use the original name with capitals:

```sql
-- In phpMyAdmin SQL tab:
DROP DATABASE IF EXISTS `blood bank management system`;
CREATE DATABASE `Blood Bank Management System` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

Then revert `backend/config.php`:

```php
const DB_NAME = 'Blood Bank Management System';
```

### Option 2: Use Underscore (Recommended for Production)

Create a new database with underscores:

```sql
CREATE DATABASE `blood_bank_management_system` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

Update `backend/config.php`:

```php
const DB_NAME = 'blood_bank_management_system';
```

Then run `install.php` again.

---

## ✅ Current Configuration

Your system is now configured to use:

- **Database Name:** `blood bank management system` (lowercase with spaces)
- **Config File:** `backend/config.php`
- **Install Script:** `install.php` (fixed backticks)

---

## 🎯 Next Steps

1. **Clear Browser Cache** - Press Ctrl+Shift+Delete
2. **Run Installation** - Visit `/install.php`
3. **Verify Success** - Should see green checkmarks
4. **Login** - Use admin/admin123

---

## 📞 If You Still Get Errors

### Check These:

1. **Database exists?**
   ```sql
   SHOW DATABASES LIKE 'blood%';
   ```

2. **Can you connect?**
   ```
   Visit: /test-db.php
   ```

3. **Check exact name:**
   - Open phpMyAdmin
   - Look at database list
   - Copy exact name including capitalization

4. **Manual fix:**
   - Edit `backend/config.php`
   - Make `DB_NAME` match EXACTLY what you see in phpMyAdmin

---

## 💡 Pro Tips

- **Best Practice:** Use underscores in database names (no spaces)
- **Case Sensitivity:** Always use lowercase for cross-platform compatibility
- **Backup First:** Before making changes, backup via phpMyAdmin

---

**Your installation should work now!** 🚀

*Last Updated: March 11, 2026*
