# 🚀 Full Automated Pterodactyl Order System

## ✨ Features

### 🤖 Complete Automation Flow
```
User Order → Pay QRIS → Webhook Verify → Auto Create Server → Send Invoice → Track Online
```

### 💎 Key Features
- ✅ **Unique Invoice ID** - Setiap order dapat invoice unik (INV-xxxxx)
- ✅ **Auto Payment Verification** - QRIS payment auto-verify via Duitku webhook
- ✅ **Instant Server Creation** - Server langsung dibuat setelah pembayaran konfirmasi
- ✅ **Order Tracking** - User bisa check status pesanan real-time dengan invoice ID
- ✅ **Web-based UI** - Modern, responsive design
- ✅ **Database SQLite** - Data tersimpan aman & terenkripsi
- ✅ **Telegram Notifications** - Notifikasi ke bot Telegram
- ✅ **Email Support** - Optional email notification

---

## 🔧 Setup & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` dan isi konfigurasi Anda:
```bash
cp .env.example .env
```

Edit file `.env`:
```env
# Bot Token Telegram Anda
BOT_TOKEN=8581665920:YOUR_ACTUAL_TOKEN

# Owner ID Telegram
OWNER_ID=5894696119

# Duitku API
DUITKU_MERCHANT_CODE=D20182
DUITKU_API_KEY=your-duitku-api-key

# Pterodactyl Panel
PTERO_DOMAIN=https://your-panel.com
PTERO_CLIENT_TOKEN=your-client-token
```

### 3. Start Development
```bash
npm run dev
```

### 4. Deploy to Vercel
```bash
# Login Vercel
vercel login

# Deploy
vercel --prod
```

---

## 📊 Database Schema

### Orders Table
- `invoice_id` - Unique invoice number (INV-xxxxx)
- `customer_name`, `email`, `phone` - Customer details
- `package_id`, `price` - Product info
- `status` - pending/paid/processing/completed/expired
- `pterodactyl_server_id`, `username`, `password` - Server credentials
- `created_at`, `paid_at`, `completed_at` - Timestamps

### Payments Table
- `transaction_id` - Duitku transaction reference
- `payment_status` - Status dari payment gateway
- `webhook_verified` - Flag verifikasi webhook

---

## 🌐 API Endpoints

### Public APIs
```
GET  /api/products        - Get product catalog
POST /api/orders          - Create new order with unique invoice
GET  /api/track/:id       - Check order status by invoice ID
GET  /health              - Health check
```

### Webhooks
```
POST /api/webhooks/payment    - Duitku payment verification
```

---

## 🔄 Automation Process

1. **Order Creation**
   - User pilih paket & isi form
   - Sistem generate unique invoice ID (INV-xxxxxxxx)
   - Order disimpan di database dengan status 'pending'

2. **Payment Processing**
   - User bayar via QRIS/Transfer/E-Wallet
   - Payment gateway notif ke webhook endpoint
   - Webhook verify payment status

3. **Server Provisioning**
   - Payment confirmed? → Auto trigger server creation
   - Call Pterodactyl API untuk buat server baru
   - Generate username & password random
   - Update order dengan credentials server

4. **Notification & Tracking**
   - Kirim detail ke customer (WA/Email)
   - User dapat tracking URL dengan invoice ID
   - Real-time status check: `yoursite.com/track/INV-xxxxx`

---

## 🔒 Security

- ✅ HTTPS everywhere
- ✅ Rate limiting untuk API endpoints
- ✅ Input validation & sanitization
- ✅ Encrypted sensitive data in database
- ✅ Webhook signature verification
- ✅ SQL injection prevention (parameterized queries)

---

## 📱 Tracking Feature

Setiap customer mendapat:
- **Invoice ID Unik**: INV-1234567890
- **Tracking URL**: `https://yoursite.vercel.app/track/INV-1234567890`
- **Real-time Status**: Lihat progress pesanan
- **Server Credentials**: Setelah completed, dapat panel URL + login

---

## 📞 Support

Telegram: @sipicung  
Channel: t.me/tokopicung  
Developer: Tn Ajie Inc (Nexus Inc)

---

© Copyright 2021 - 2025 Nexus Inc
