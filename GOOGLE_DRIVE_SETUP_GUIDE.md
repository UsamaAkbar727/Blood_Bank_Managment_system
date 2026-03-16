# Google Drive Integration Setup Guide

## Overview
The Blood Bank Management System now supports exporting reports directly to Google Drive instead of downloading them locally. This feature requires proper Google Cloud Platform (GCP) setup and OAuth authentication.

## Prerequisites

### 1. PHP Requirements
- PHP 7.4 or higher
- `composer` installed and working
- FTP/SSH access to the web server
- `curl` and `json` PHP extensions (usually installed by default)

### 2. Google Cloud Project
- A Google Cloud Platform account
- A new GCP project created
- Google Drive API enabled
- OAuth 2.0 credentials (Service Account or User credentials)

## Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: "Blood Bank Management System"
5. Click "CREATE"
6. Wait for the project to be created (this may take a minute)

### Step 2: Enable Google Drive API

1. In the Cloud Console, go to APIs & Services > Library
2. Search for "Google Drive API"
3. Click on it
4. Click "ENABLE"

### Step 3: Create OAuth 2.0 Credentials

#### Option A: Using a Service Account (Recommended for backend automation)

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "Service Account"
3. Enter details:
   - Service account name: "bbms-drive-export"
   - Leave optional fields blank
4. Click "CREATE AND CONTINUE"
5. Grant the service account basic editor role (optional but useful)
6. Click "CONTINUE" then "DONE"
7. Click on the created service account
8. Go to "Keys" tab
9. Click "Add Key" > "Create new key"
10. Choose "JSON" format
11. Click "CREATE" - a JSON file will download
12. Save this file securely on your web server

#### Option B: Using OAuth User Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `https://yourdomain.com/api/reports/drive-auth.php`
   - `http://localhost:8000/api/reports/drive-auth.php` (for development)
5. Click "CREATE"
6. Copy the Client ID and Client Secret
7. Download the credentials as JSON

## Installation

### Step 1: Install Google API Client Library

SSH into your web server and run:

```bash
cd /path/to/Blood\ Bank\ Management\ System
composer require google/apiclient
```

This installs the Google APIs PHP client library (required for Google Drive operations).

### Step 2: Create .env File

In the root backend directory, create or update `backend/.env`:

```env
# Google Drive Configuration
GOOGLE_DRIVE_CREDENTIALS_PATH=/path/to/credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
```

### Step 3: Set Up Google Drive Folder

1. Log in to [Google Drive](https://drive.google.com)
2. Create a new folder called "BBMS Reports"
3. Right-click the folder > "Get link"
4. Copy the folder ID from the URL (it's the long string in `/folders/{FOLDER_ID}`)
5. Add this as `GOOGLE_DRIVE_FOLDER_ID` in your `.env` file

If using Service Account:
1. Right-click the folder > "Share"
2. Add the service account email: `bbms-drive-export@PROJECT_ID.iam.gserviceaccount.com`
3. Grant Editor permissions
4. Click "Share"

### Step 4: Place Credentials File

1. Upload the credentials JSON file to your server
2. Place it at a secure location (NOT in the web root)
3. Update the path in `.env` to point to this file
4. Restrict file permissions: `chmod 600 /path/to/credentials.json`

Example path: `/var/secrets/google/credentials.json`

### Step 5: Verify Installation

Run the status check:

```bash
php -r "
require_once 'backend/config.php';
require_once 'backend/lib/GoogleDriveService.php';
\$status = GoogleDriveService::getStatus();
echo json_encode(\$status, JSON_PRETTY_PRINT);
"
```

Expected output (if properly configured):
```json
{
  "credentials_configured": true,
  "authenticated": true,
  "folder_id_configured": true,
  "folder_id": "1a2b3c4d5e6f..."
}
```

## Usage

### For Users

1. Go to Reports Dashboard
2. Select date range (Last 7/30/90 days)
3. Click "☁️ Save Excel to Drive" or "☁️ Save PDF to Drive"
4. Wait for upload to complete (status shows "⏳ Uploading...")
5. Click "Open in Drive →" to view the file in Google Drive
6. File is now accessible from any device via Google Drive

### For Administrators

#### Check Integration Status

```bash
curl -X GET http://yourdomain.com/api/reports/drive-status.php \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Troubleshooting

**Issue**: "Google Drive credentials not configured"
- **Solution**: Check `GOOGLE_DRIVE_CREDENTIALS_PATH` in `.env` file
- Ensure the file exists and is readable
- Check file permissions: `ls -la /path/to/credentials.json`

**Issue**: "GOOGLE_DRIVE_FOLDER_ID not configured"
- **Solution**: Add `GOOGLE_DRIVE_FOLDER_ID` to `.env`
- Verify the folder ID is correct (from Google Drive URL)
- Ensure the service account has access to the folder

**Issue**: "Authentication required. Please complete OAuth setup"
- **Solution**: For Service Account: Token file will be auto-generated
- For OAuth user credentials: Implement OAuth flow in `drive-auth.php`
- Check that the token file location is writable

## File Structure

```
├── backend/
│   ├── lib/
│   │   └── GoogleDriveService.php      (New - Google Drive integration)
│   ├── .env                             (Updated - add Google Drive config)
│   └── config.php
├── api/
│   └── reports/
│       ├── drive-export.php             (New - export to Drive endpoint)
│       └── export.php                   (Existing - local download endpoint)
├── frontend/
│   └── src/
│       └── pages/
│           └── Reports.jsx              (Updated - new UI buttons)
└── composer.json                        (Updated - Google API dependency)
```

## API Endpoints

### Export to Google Drive

**POST** `/api/reports/drive-export.php`

Request:
```json
{
  "format": "excel",
  "days": 30
}
```

Response (Success - 201):
```json
{
  "success": true,
  "data": {
    "id": "1abc...",
    "name": "BBMS_Report_2026-03-16_14-30-45.xls",
    "url": "https://drive.google.com/file/d/1abc.../view",
    "createdTime": "2026-03-16T14:30:45Z",
    "owners": [...]
  },
  "message": "Report uploaded successfully to Google Drive"
}
```

Response (Error - 400/500):
```json
{
  "error": "drive_error",
  "message": "Detailed error message"
}
```

## Security Considerations

### Credentials Protection

1. **Never commit credentials to version control**
   - Add to `.gitignore`: `backend/.env`, `/path/to/credentials.json`
   
2. **Restrict file permissions**
   ```bash
   chmod 600 /path/to/credentials.json
   chmod 600 backend/.env
   ```

3. **Use environment variables**
   - Don't hardcode paths in code
   - Load from `.env` only

### Access Control

1. **API Authentication**
   - All Google Drive endpoints require authenticated user
   - Check `Auth::currentUser()` before processing

2. **Folder Permissions**
   - Only grant access to dedicated "BBMS Reports" folder
   - Use separate GCP project for isolation
   - Audit folder access regularly

3. **Token Management**
   - Tokens stored in `.google_drive_token.json` (not in web root)
   - Auto-refresh on expiry
   - Remove token if credentials compromised

## Maintenance

### Regular Tasks

1. **Monitor Quota**
   - Google Drive API has usage quotas
   - Monthly check: Cloud Console > APIs & Services > Quotas

2. **Audit Reports Folder**
   - Monthly cleanup of old reports (>90 days)
   - Review who has access to the folder

3. **Update Credentials**
   - Service Account keys: rotate every 90 days
   - OAuth tokens: automatically refreshed

### Troubleshooting Commands

Check credentials validity:
```bash
php -r "
require_once 'backend/lib/GoogleDriveService.php';
try {
  \$status = GoogleDriveService::getStatus();
  echo 'Status: ' . json_encode(\$status);
} catch (Exception \$e) {
  echo 'Error: ' . \$e->getMessage();
}
"
```

Check file system permissions:
```bash
ls -la backend/.env
ls -la /path/to/credentials.json
ls -la backend/lib/.google_drive_token.json
```

## Rollback to Local Downloads

If Google Drive integration fails, revert to local file downloads:

1. Revert frontend buttons (Reports.jsx) to use `/api/reports/export.php`
2. Keep `export.php` endpoint active for backward compatibility
3. Users can download reports locally while issues are resolved

## Support

For issues with:
- **Google Cloud Setup**: See [Google Cloud Docs](https://cloud.google.com/docs)
- **Google Drive API**: See [Drive API Reference](https://developers.google.com/drive/api/v3/about-sdk)
- **PHP Client**: See [Google APIs Client Library for PHP](https://github.com/googleapis/google-api-php-client)

## Configuration Examples

### Production Environment (SSL over HTTPS)

```env
GOOGLE_DRIVE_CREDENTIALS_PATH=/var/secrets/google/credentials.json
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

### Development Environment (Local Testing)

```env
GOOGLE_DRIVE_CREDENTIALS_PATH=/home/dev/project/secrets/credentials.json
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

## Features

✅ Upload Excel reports to Google Drive  
✅ Upload PDF reports to Google Drive  
✅ Automatic file naming with timestamp  
✅ Shareable links generated automatically  
✅ Support for service account auth  
✅ Support for OAuth user auth  
✅ Token auto-refresh  
✅ Error handling and logging  
✅ No local file storage  
✅ Works across all platforms/devices  

## Limitations

- Large reports (>5MB) may take longer to upload
- Google Drive API rate limits: 1,000 requests per 100 seconds per user
- Folder access requires proper GCP permissions
- Tokens expire and require refresh
