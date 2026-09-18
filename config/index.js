require('dotenv').config();
const path = require('path');

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Database settings
  database: {
    path: process.env.DB_FILE_PATH || './database/orders.db',
    encryptionKey: process.env.DB_ENCRYPTION_KEY || 'default-key-change-in-production'
  },

  // Telegram Bot (optional)
  telegram: {
    token: process.env.BOT_TOKEN || '',
    ownerId: process.env.OWNER_ID || ''
  },

  // Payment Gateway - Duitku
  duitku: {
    merchantCode: process.env.DUITKU_MERCHANT_CODE,
    apiKey: process.env.DUITKU_API_KEY,
    webhookSecret: process.env.DUITKU_WEBHOOK_SECRET,
    webhookUrl: process.env.DUITKU_WEBHOOK_URL
  },

  // Pterodactyl Panel
  pterodactyl: {
    domain: process.env.PTERO_DOMAIN,
    clientToken: process.env.PTERO_CLIENT_TOKEN,
    egg: parseInt(process.env.PTERO_EGG) || 15,
    location: parseInt(process.env.PTERO_LOCATION) || 1,
    nodeName: process.env.PTERO_NODE_NAME || 'production-node'
  },

  // Invoice settings
  invoice: {
    prefix: process.env.INVOICE_PREFIX || 'INV',
    expiryHours: parseInt(process.env.INVOICE_EXPIRY_HOURS) || 24,
    validityDays: parseInt(process.env.INVOICE_VALIDITY_DAYS) || 7
  },

  // Email SMTP
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@yoursite.com'
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
  },

  // URLs
  urls: {
    site: process.env.SITE_URL || 'http://localhost:3000',
    adminDashboard: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000/admin'
  },

  // Paths
  paths: {
    public: path.join(__dirname, '..', 'dist', 'public'),
    uploads: path.join(__dirname, '..', 'dist', 'uploads'),
    src: path.join(__dirname, '..', 'src')
  }
};
