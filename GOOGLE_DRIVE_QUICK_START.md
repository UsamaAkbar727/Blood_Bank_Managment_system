# Google Drive Integration - Quick Start Checklist

**Goal**: Set up Google Drive report export so reports upload to the cloud instead of downloading locally.

**Time Required**: 15-30 minutes  
**Difficulty**: Medium  
**Prerequisites**: GCP account, FTP/SSH to server, composer installed

---

## Phase 1: Google Cloud Setup (5 minutes)

### ☐ Create Google Cloud Project
```
1. Go to https://console.cloud.google.com
2. Click project dropdown at top > NEW PROJECT
3. Name: "Blood Bank Management System"
4. Click CREATE
5. Wait ~1 minute for project creation
```

### ☐ Enable Google Drive API
```
1. In Cloud Console: APIs & Services > Library
2. Search: "Google Drive API"
3. Click result
4. Click ENABLE
5. Wait for enablement to complete
```

### ☐ Create Service Account
```
1. Cloud Console: APIs & Services > Credentials
2. Click CREATE CREDENTIALS > Service Account
3. Service account name: "bbms-drive-export"
4. Click CREATE AND CONTINUE
5. Grant role: Editor (optional but helpful)
6. Click CONTINUE then DONE
7. Go back to Credentials page
```

### ☐ Download Credentials JSON
```
1. Under Service Accounts, click on "bbms-drive-export"
2. Go to KEYS tab
3. Click ADD KEY > Create new key
4. Select JSON format
5. Click CREATE
6. JSON file downloads automatically
7. **IMPORTANT**: Keep this file secure, never share it
```

---

## Phase 2: Google Drive Setup (3 minutes)

### ☐ Create Reports Folder
```
1. Go to https://drive.google.com
2. Right-click > New folder
3. Name: "BBMS Reports"
4. Open the folder
5. Copy the folder ID from the URL:
   https://drive.google.com/drive/folders/{FOLDER_ID}
   (Save the ID, you'll need it in next step)
```

### ☐ Grant Service Account Access
```
1. In "BBMS Reports" folder
2. Right-click > Share
3. In "Share with people and groups" box:
   Paste: bbms-drive-export@PROJECT_ID.iam.gserviceaccount.com
   (Replace PROJECT_ID with your GCP project ID, visible in Cloud Console)
4. Change permission to "Editor"
5. Click SHARE
6. Click DONE
```

---

## Phase 3: Server Setup (8-15 minutes)

### ☐ Upload Credentials to Server
```bash
# Using SCP (Mac/Linux):
scp downloads/credentials.json user@your-server:/var/secrets/google/credentials.json

# Or using FTP:
1. Create folder: /var/secrets/google/
2. Upload credentials.json there
3. Set permissions: chmod 600 credentials.json
```

### ☐ Install Google API Library
```bash
# SSH into your server and run:
cd /var/www/html/Blood\ Bank\ Management\ System
composer require google/apiclient

# If composer not installed:
# Download from https://getcomposer.org
```

### ☐ Update .env File
```bash
# Edit backend/.env and add these lines:
GOOGLE_DRIVE_CREDENTIALS_PATH=/var/secrets/google/credentials.json
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j

# Replace FOLDER_ID with the ID from "Create Reports Folder" step above
# Example: your URL was https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
# So GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

### ☐ Set File Permissions
```bash
chmod 600 /var/secrets/google/credentials.json
chmod 600 backend/.env
```

---

## Phase 4: Verification (2-3 minutes)

### ☐ Check Status Endpoint
```bash
# Check if integration is ready:
curl -X GET http://your-domain.com/api/reports/drive-status.php \
  -H "Cookie: bbms_session=YOUR_SESSION_ID"

# Should return:
# {
#   "ready": true,
#   "checks": {...}
# }
```

### ☐ Test in Web Interface
```
1. Log in to Blood Bank Management System
2. Go to Reports Dashboard
3. Select date range (e.g., "Last 30 days")
4. Click "☁️ Save Excel to Drive"
5. Button should show "⏳ Uploading..."
6. After ~5-10 seconds, success message appears
7. Click "Open in Drive →"
8. Verify file appears in Google Drive
```

### ☐ Test PDF Export
```
1. Go back to Reports Dashboard
2. Click "☁️ Save PDF to Drive"
3. Wait for upload
4. Verify file appears with PDF filename
5. Click "Open in Drive →"
6. Verify PDF opens correctly
```

---

## Troubleshooting

### Problem: "Invalid credentials path"
```
✓ Check that file exists: ls -la /var/secrets/google/credentials.json
✓ Check path in .env matches exactly
✓ Check file permissions: chmod 600 credentials.json
✓ Try absolute path, not relative
```

### Problem: "Folder not found"
```
✓ Copy folder ID again from Google Drive URL
✓ Make sure it's the FOLDER ID, not the file ID
✓ Verify service account can access folder (Check sharing)
✓ Try with a different test folder first
```

### Problem: "Authentication failed"
```
✓ Verify service account email in folder sharing settings
✓ Check that credentials.json is readable by web server user
✓ Try removing .google_drive_token.json (if exists) to force re-auth
✓ Check for typos in PROJECT_ID when adding service account
```

### Problem: Upload button doesn't do anything
```
✓ Check browser console for errors (F12)
✓ Check that /api/reports/drive-export.php exists
✓ Try drive-status.php endpoint to verify configuration
✓ Check web server error logs for PHP errors
```

### Problem: "Composer not installed" error
```bash
✓ Install composer:
curl -sS https://getcomposer.org/installer | php
✓ Move to system path:
sudo mv composer.phar /usr/local/bin/composer
✓ Then run:
composer require google/apiclient
```

---

## File Locations Reference

```
Web Root:
/var/www/html/Blood Bank Management System/

Add these files:
/var/secrets/google/credentials.json        ← Your GCP credentials
backend/.env                                  ← Configuration

Modified files:
frontend/src/pages/Reports.jsx              ← Updated UI
backend/lib/GoogleDriveService.php          ← New service
api/reports/drive-export.php                ← New endpoint
api/reports/drive-status.php                ← New endpoint
```

---

## Verification Checklist Summary

- [ ] GCP Project created
- [ ] Google Drive API enabled
- [ ] Service account created
- [ ] Credentials JSON downloaded
- [ ] BBMS Reports folder created in Drive
- [ ] Service account granted access to folder
- [ ] Credentials uploaded to server
- [ ] Google API library installed via composer
- [ ] .env updated with credentials path and folder ID
- [ ] File permissions set (chmod 600)
- [ ] drive-status.php returns ready:true
- [ ] Excel export works and file appears in Drive
- [ ] PDF export works and file appears in Drive
- [ ] "Open in Drive" link works

---

## Success Indicators

✅ Reports appear in Google Drive "BBMS Reports" folder  
✅ Files have correct names with timestamps  
✅ Success message shows after upload  
✅ "Open in Drive →" button is clickable  
✅ Web server can access credentials file  
✅ No errors in browser console or server logs  

---

## Support Resources

| Issue | Resource |
|-------|----------|
| Google Cloud setup | [Cloud Console Help](https://cloud.google.com/docs) |
| Drive API docs | [Google Drive API](https://developers.google.com/drive) |
| PHP client | [Google APIs PHP Client](https://github.com/googleapis/google-api-php-client) |
| Composer help | [Composer Docs](https://getcomposer.org/doc/) |
| This implementation | GOOGLE_DRIVE_SETUP_GUIDE.md |

---

## If Setup Fails

**Rollback to Local Download**:
```bash
# Edit Reports.jsx and revert exportReport function:
const exportReport = (format) => {
  const url = `/api/reports/export.php?format=${encodeURIComponent(format)}&days=${days}`;
  window.open(url, '_blank');
};
```

This will restore the original download behavior while you troubleshoot setup issues.

---

**Estimated Total Setup Time**: 20-40 minutes  
**Last Updated**: March 16, 2026  
**Status**: Ready for Implementation
