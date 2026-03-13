# 🏥 Blood Bank Management System

A comprehensive, modern web-based blood bank management solution for healthcare facilities.

![Status](https://img.shields.io/badge/status-ready-success)
![PHP](https://img.shields.io/badge/PHP-8.0+-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## ✨ Features

### 🔐 Authentication & Authorization
- Secure login system with session management
- Role-based access control (Admin, Staff, Lab Tech, Doctor, etc.)
- CSRF protection
- Password hashing with bcrypt

### 👥 Donor Management
- Complete donor profiles with medical history
- Donation tracking and eligibility checking
- Donor search and filtering
- Last donation date tracking

### 🩸 Blood Collection
- Record blood collections with details
- Bag type selection (350ml, 450ml)
- Collection site tracking
- Automatic donor record updates

### 🔬 Screening & Testing
- Comprehensive disease screening:
  - HBsAg (Hepatitis B)
  - HCV (Hepatitis C)
  - HIV
  - Malaria
  - Syphilis
- Blood group confirmation
- Hemoglobin level tracking
- Result management

### 📦 Inventory Management
- Real-time blood component tracking
- Component types:
  - Whole Blood
  - PRBC (Packed Red Blood Cells)
  - Platelets
  - FFP (Fresh Frozen Plasma)
  - Plasma
  - Cryoprecipitate
- Expiry date monitoring
- Stock level alerts
- Storage location tracking

### 🏥 Patient Management
- Patient registration and profiles
- Blood group records
- Diagnosis tracking
- Attending doctor assignment
- Treatment history

### 📤 Blood Issuance
- Cross-matching test results
- Units issued tracking
- Return processing
- Transfusion reaction monitoring
- Patient-wise issuance records

### 💰 Financial Management
- Billing and invoicing
- Expense tracking
- Pricing management per component and blood group
- Payment status tracking
- Discount handling

### 📊 Reports & Analytics
- Collection statistics
- Inventory reports
- Usage patterns
- Donor analytics
- Financial summaries
- Custom report generation

### 🔔 Notifications & Alerts
- Low stock alerts
- Expiry notifications
- Shortage warnings
- In-app notification system

### 📝 Activity Logging
- Comprehensive audit trail
- User action tracking
- System event logs
- IP address logging

### 💾 Database Backups
- Automated backup scheduling
- Manual backup creation
- Backup restoration
- Google Drive integration (optional)

### 📱 SMS Alerts
- Configurable SMS gateway
- Donor notifications
- Staff alerts
- Emergency notifications

---

## 🛠️ Tech Stack

### Backend
- **PHP 8.0+** - Server-side logic
- **MySQL 8.0+** - Database
- **Pure PHP Classes** - No framework dependencies
- **Prepared Statements** - SQL injection prevention

### Frontend
- **React 19** - UI library
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Chart.js** - Data visualization
- **ZXing** - Barcode scanning
- **JSBarcode** - Barcode generation

### Security
- **Session-based authentication**
- **CSRF tokens**
- **Password hashing (bcrypt)**
- **SQL injection prevention**
- **XSS protection headers**
- **HTTPS support**

---

## 🚀 Installation

### Quick Start (5 minutes)

1. **Start XAMPP:**
   ```
   - Open XAMPP Control Panel
   - Start Apache
   - Start MySQL
   ```

2. **Install Database:**
   ```
   Visit: http://localhost/Blood%20Bank%20Management%20System/install.php
   ```

3. **Launch Application:**
   ```
   Visit: http://localhost/Blood%20Bank%20Management%20System/frontend/dist/index.html
   ```

4. **Login:**
   ```
   Username: admin
   Password: admin123
   ```

### Detailed Installation

For step-by-step instructions, see:
- [`INSTALLATION_GUIDE.md`](./INSTALLATION_GUIDE.md) - Complete installation guide
- [`QUICK_START.md`](./QUICK_START.md) - Quick reference
- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) - Setup documentation

### Requirements

- **PHP:** 8.0 or higher
- **MySQL:** 8.0 or higher
- **Web Server:** Apache (XAMPP)
- **Node.js:** 16+ (optional, for development)
- **Browser:** Modern browser with JavaScript enabled

---

## 📖 Usage

### For Administrators

1. **Dashboard Overview:**
   - View real-time statistics
   - Monitor recent activities
   - Access quick actions

2. **User Management:**
   - Create staff accounts
   - Assign roles and permissions
   - Monitor user activities

3. **System Configuration:**
   - Set blood pricing
   - Configure alerts
   - Manage SMS settings

### For Staff

1. **Donor Operations:**
   - Register new donors
   - Record donations
   - Update donor information

2. **Inventory Management:**
   - Add blood components
   - Track stock levels
   - Monitor expiry dates

3. **Patient Services:**
   - Process patient requests
   - Issue blood units
   - Generate bills

### For Lab Technicians

1. **Screening:**
   - Perform disease tests
   - Record test results
   - Confirm blood groups

2. **Quality Control:**
   - Reject unsafe units
   - Document findings
   - Maintain records

---

## 🔌 API Documentation

### Authentication Endpoints

```
POST   /api/auth/login.php       - User login
POST   /api/auth/logout.php      - User logout
GET    /api/auth/me.php          - Get current user
```

### Donor Endpoints

```
GET    /api/donors/index.php     - List all donors
GET    /api/donors/index.php?id={id} - Get donor by ID
POST   /api/donors/index.php     - Create donor
PUT    /api/donors/index.php?id={id} - Update donor
DELETE /api/donors/index.php?id={id} - Delete donor
```

### Collection Endpoints

```
GET    /api/collections/index.php     - List collections
POST   /api/collections/index.php     - Create collection
PUT    /api/collections/index.php     - Update collection
DELETE /api/collections/index.php     - Delete collection
```

### Inventory Endpoints

```
GET    /api/inventory/index.php?action=list    - List inventory
GET    /api/inventory/index.php?action=summary - Get summary
GET    /api/inventory/index.php?action=expiring - Get expiring soon
GET    /api/inventory/index.php?action=low     - Get low stock
```

### Test All APIs

```
GET    /api/test.php    - Run API diagnostics
```

---

## 🗄️ Database Schema

### Core Tables (13)

1. **users** - Staff and admin accounts
2. **donors** - Blood donor records
3. **collections** - Blood collection records
4. **screening_tests** - Disease screening results
5. **inventory** - Blood component inventory
6. **patients** - Patient records
7. **blood_issuance** - Blood issuance tracking
8. **billing_records** - Billing and invoices
9. **expenses** - Expense tracking
10. **blood_pricing** - Pricing configuration
11. **logs** - System activity logs
12. **notifications** - In-app notifications
13. **backup_logs** - Backup history

### Entity Relationships

```
users (1) ──→ (many) donors
users (1) ──→ (many) collections
users (1) ──→ (many) patients
donors (1) ──→ (many) collections
collections (1) ──→ (1) screening_tests
collections (1) ──→ (many) inventory
inventory (many) ──→ (1) patients (via blood_issuance)
```

Full schema available in: [`database/schema.sql`](./database/schema.sql)

---

## 📸 Screenshots

### Dashboard
*Real-time statistics and overview*

### Donor Management
*Complete donor registry with search and filter*

### Inventory
*Live stock tracking with expiry alerts*

### Screening
*Disease testing interface*

### Reports
*Analytics and reporting dashboard*

---

## 🔒 Security

### Implemented Features

✅ **Authentication:**
- Session-based authentication
- Password hashing with bcrypt
- Session regeneration on login
- HTTP-only cookies

✅ **Authorization:**
- Role-based access control
- Module-level permissions
- Admin override capabilities

✅ **Data Protection:**
- Prepared statements (SQL injection prevention)
- Input sanitization
- Output escaping
- CSRF token validation

✅ **Headers:**
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

### Best Practices

⚠️ **After Installation:**
1. Change default admin password immediately
2. Delete `install.php` and `test-db.php`
3. Update database credentials
4. Enable HTTPS in production
5. Set proper file permissions
6. Configure regular backups

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone <your-fork>

# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

### Getting Help

1. **Documentation:**
   - [`INSTALLATION_GUIDE.md`](./INSTALLATION_GUIDE.md)
   - [`QUICK_START.md`](./QUICK_START.md)
   - [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)

2. **Diagnostics:**
   - `/api/test.php` - API diagnostics
   - `/test-db.php` - Database diagnostics

3. **Troubleshooting:**
   - Check browser console (F12)
   - Review PHP error logs
   - Verify XAMPP services running

### Common Issues

**Login not working?**
- Run `install.php` first
- Clear browser cache
- Check database connection

**Blank screen?**
- Check browser console for errors
- Verify frontend build exists
- Rebuild: `npm run build`

**API errors?**
- Visit `/api/test.php`
- Check error logs
- Verify database tables exist

---

## 🙏 Acknowledgments

- React team for the amazing UI library
- Vite team for the blazing fast build tool
- Tailwind CSS team for the utility-first CSS framework
- Chart.js team for data visualization
- All contributors and supporters

---

## 📞 Contact

For questions, issues, or feature requests, please:

1. Check existing documentation
2. Run diagnostic tools
3. Review troubleshooting guides
4. Create an issue with detailed information

---

## 🎯 Roadmap

### Version 1.0 (Current)
- ✅ Core blood bank features
- ✅ User authentication
- ✅ Inventory management
- ✅ Basic reporting

### Future Versions
- 🔄 Mobile app (React Native)
- 🔄 Advanced analytics
- 🔄 Multi-bank support
- 🔄 Integration with hospital systems
- 🔄 Offline mode
- 🔄 Multi-language support

---

**Made with ❤️ for Healthcare**

*Last Updated: March 11, 2026*  
*Version: 1.0.0*
#   b l o o d - b a n k  
 