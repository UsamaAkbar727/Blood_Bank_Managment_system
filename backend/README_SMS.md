# SMS Alerts Integration

Configuration (`backend/config.php`):

- `SMS_API_URL` – HTTP endpoint of your SMS gateway (POST JSON).
- `SMS_API_KEY` – API key/token.
- `SMS_SENDER_ID` – sender name/number.
- `ALERT_STAFF_NUMBERS` – array of staff phone numbers (E.164).

Helpers:

- `SmsService::send($to, $message)` – low-level send (throws on failure).
- `SmsService::notifyStaff($message)` – broadcast to `ALERT_STAFF_NUMBERS`.
- `AlertService::sendLowStockAlerts()` – sends summary of low-stock units.
- `AlertService::sendExpiryAlerts($days)` – alerts for units expiring within N days.

Endpoints (auth required):

- `POST /api/alerts/send.php` – body: `{ "to": "+1123...", "message": "text" }`.
- `GET /api/alerts/shortage.php` – triggers low-stock broadcast.
- `GET /api/alerts/expiry.php?days=3` – triggers expiry broadcast.

Suggested cron:

```
# Low stock daily 09:00
curl -s http://yourhost/api/alerts/shortage.php
# Expiry alerts daily 08:00 (next 3 days)
curl -s "http://yourhost/api/alerts/expiry.php?days=3"
```
