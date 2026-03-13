# 🚀 Blood Bank Management System - Quick Reference Card

## ⚡ 30-Second Setup

```
1. Start XAMPP → Apache + MySQL
2. Visit: http://localhost/Blood%20Bank%20Management%20System/install.php
3. Click "Install"
4. Launch App → Login: admin / admin123
```

---

## 🔑 Essential URLs

| Purpose | URL |
|---------|-----|
| **Home** | `http://localhost/Blood%20Bank%20Management%20System/` |
| **Install** | `http://localhost/Blood%20Bank%20Management%20System/install.php` |
| **App** | `http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html` |
| **DB Test** | `http://localhost/Blood%20Bank%20Management%20System/test-db.php` |
| **API Test** | `http://localhost/Blood%20Bank%20Management%20System/api/test.php` |

---

## 🔐 Default Login

```
Username: admin
Password: admin123
⚠️ CHANGE IMMEDIATELY!
```

---

## 📁 Key Folders

```
api/          - Backend endpoints
backend/lib/  - Business logic
frontend/dist - Production app
database/     - Schema file
```

---

## 🗄️ Database Tables (13)

users, donors, collections, screening_tests, inventory, patients, blood_issuance, billing_records, expenses, blood_pricing, logs, notifications, backup_logs

---

## 🛠️ Common Commands

### Frontend Development
```bash
cd frontend
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Production build
```

### Database Reset
```sql
DROP DATABASE `Blood Bank Management System`;
-- Then re-run install.php
```

---

## ✅ Quick Verification

- [ ] XAMPP running (Apache + MySQL)
- [ ] Can access welcome page
- [ ] Installation completed successfully
- [ ] Can login with admin/admin123
- [ ] Dashboard loads
- [ ] No console errors

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Apache won't start | Close Skype, change port to 8080 |
| MySQL won't start | Restart computer, change port |
| Login fails | Run install.php, clear cache |
| Blank screen | Check console (F12), rebuild frontend |
| API errors | Visit /api/test.php, check logs |

---

## 📖 Documentation Files

- `INSTALLATION_GUIDE.md` - Complete setup (561 lines)
- `QUICK_START.md` - Quick reference (289 lines)
- `VERIFICATION_CHECKLIST.md` - Testing guide (395 lines)
- `PROJECT_SUMMARY.md` - Completion report (643 lines)
- `README.md` - Project overview (503 lines)

---

## 🎯 Module Access

After login, access these modules from dashboard:
- 👥 Donors
- 🩸 Collections
- 📦 Inventory
- 🏥 Patients
- 📤 Issuance
- 💰 Finance
- 📊 Reports
- 📝 Logs
- 🔔 Notifications
- 💾 Backups

---

## 🔒 Security Checklist

- [ ] Changed admin password
- [ ] Delete install.php & test-db.php
- [ ] Update backend/config.php
- [ ] Enable HTTPS (production)
- [ ] Set file permissions
- [ ] Configure backups

---

## 📞 Quick Help

### Diagnostics
1. Browser Console: **F12**
2. DB Test: `/test-db.php`
3. API Test: `/api/test.php`

### Logs Location
- PHP Error Log: `xampp/apache/logs/error.log`
- Access Log: `xampp/apache/logs/access.log`

---

## 🎉 Success Indicators

✅ Green status in XAMPP  
✅ Welcome page loads  
✅ Installation shows success  
✅ Login works  
✅ Dashboard displays data  
✅ No red errors anywhere  

---

## 📱 System Requirements

- PHP 8.0+
- MySQL 8.0+
- Apache (XAMPP)
- Modern browser

---

**Need more help?** Read `INSTALLATION_GUIDE.md` or `QUICK_START.md`

*Quick Reference v1.0 • March 11, 2026*
