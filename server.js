require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./database/DatabaseManager');
const PterodactylAPI = require('./api/pterodactyl');
const DuitkuAPI = require('./api/duitku');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.urls.site,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'dist', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'dist', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== ORDER APIS ====================

// Get all products
app.get('/api/products', (req, res) => {
  try {
    const productsPath = path.join(__dirname, 'src', 'products.json');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load products' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      packageId, 
      paymentMethod 
    } = req.body;

    // Validate input
    if (!customerName || !customerEmail || !customerPhone || !packageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Get product details
    const productsPath = path.join(__dirname, 'src', 'products.json');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const product = products.find(p => p.id === packageId);

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Generate unique invoice ID
    const invoiceId = `${config.invoice.prefix}-${Date.now()}`;
    
    // Set expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.invoice.expiryHours);

    // Create order in database
    const result = db.createOrder({
      invoiceId,
      customerName,
      customerEmail,
      customerPhone,
      packageId,
      packageName: product.name,
      ram: product.ram,
      disk: product.disk,
      cpu: product.cpu,
      price: product.price,
      paymentMethod,
      status: 'pending',
      invoiceUrl: `${config.urls.site}/track/${invoiceId}`,
      expiresAt: expiresAt.toISOString()
    });

    // Create QR code if payment method is QRIS
    let qrCodeData = null;
    if (paymentMethod === 'qr') {
      const qrisResult = await DuitkuAPI.getQRIS();
      if (qrisResult.success) {
        qrCodeData = qrisResult.qris;
      }
    }

    // Send notification to Telegram (optional)
    if (config.telegram.token && config.telegram.ownerId) {
      sendTelegramNotification({
        type: 'new_order',
        invoiceId,
        customerName,
        packageName: product.name,
        amount: product.price
      });
    }

    res.json({
      success: true,
      data: {
        invoiceId,
        orderId: result.lastID,
        trackingUrl: `${config.urls.site}/track/${invoiceId}`,
        qrCode: qrCodeData
      }
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create order' 
    });
  }
});

// Track order
app.get('/api/track/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const order = db.getOrderById(invoiceId);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Get payment info
    const payment = db.getPaymentByInvoice(invoiceId);

    res.json({
      success: true,
      data: {
        ...order,
        payment: payment ? payment.payment_data : null,
        canPay: order.status === 'pending',
        serverReady: order.status === 'completed' && order.pterodactyl_server_id
      }
    });

  } catch (error) {
    console.error('Track Order Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track order' 
    });
  }
});

// Webhook: Payment verification from Duitku
app.post('/api/webhooks/payment', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature (if configured)
    // const signature = req.headers['x-webhook-signature'];
    // if (!verifyWebhookSignature(signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const { reference_no, transaction_id, payment_status, amount } = webhookData;

    if (!reference_no || !transaction_id || !payment_status) {
      return res.status(400).json({ error: 'Incomplete webhook data' });
    }

    // Update payment record
    await db.updatePaymentStatus(reference_no, {
      status: payment_status,
      paymentData: webhookData,
      verifiedAt: new Date().toISOString()
    });

    // If payment is successful, auto-create server
    if (payment_status === 'PAID' || payment_status === 'SUCCESS') {
      await processPaidOrder(reference_no);
    }

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Payment Webhook Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Process paid orders - Auto create server
async function processPaidOrder(invoiceId) {
  try {
    const order = db.getOrderById(invoiceId);
    
    if (!order || order.status !== 'paid') {
      return;
    }

    // Mark as processing
    db.updateOrderStatus(invoiceId, 'processing');

    // Create Pterodactyl server
    const serverResult = await PterodactylAPI.createServer(order);

    if (serverResult.success) {
      // Update order with server details
      db.updateOrderStatus(invoiceId, 'completed', {
        pterodactylServerId: serverResult.serverId,
        pterodactylUsername: `user_${invoiceId.replace(/\D/g, '')}`,
        pterodactylPassword: generateRandomPassword(12),
        pterodactylPanelUrl: serverResult.panelUrl
      });

      // Send completion notification
      sendCompletionNotification(order, serverResult);

      // Send Telegram notification
      if (config.telegram.token && config.telegram.ownerId) {
        sendTelegramNotification({
          type: 'order_completed',
          invoiceId,
          customerName: order.customer_name,
          serverId: serverResult.serverId
        });
      }
    } else {
      throw new Error('Failed to create server');
    }

  } catch (error) {
    console.error('Process Paid Order Error:', error);
    // Could send admin alert here
  }
}

// Helper functions
function generateRandomPassword(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function sendTelegramNotification(data) {
  const axios = require('axios');
  
  let message = '';
  switch(data.type) {
    case 'new_order':
      message = `🛒 PESANAN BARU!\n\n`;
      message += `📋 Invoice: ${data.invoiceId}\n`;
      message += `👤 Nama: ${data.customerName}\n`;
      message += `📦 Paket: ${data.packageName}\n`;
      message += `💰 Harga: Rp ${data.amount.toLocaleString('id-ID')}`;
      break;
    case 'order_completed':
      message = `✅ SERVER READY!\n\n`;
      message += `📋 Invoice: ${data.invoiceId}\n`;
      message += `👤 Customer: ${data.customerName}\n`;
      message += `🖥️ Server ID: ${data.serverId}`;
      break;
  }

  if (message && config.telegram.token) {
    axios.post(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
      chat_id: config.telegram.ownerId,
      text: message,
      parse_mode: 'HTML'
    }).catch(err => console.error('Telegram notification error:', err));
  }
}

function sendCompletionNotification(order, serverData) {
  // Email notification logic here
  // For now, just log
  console.log(`📧 Sending completion email to: ${order.customer_email}`);
  console.log(`🔐 Server credentials:`);
  console.log(`   Panel: ${serverData.panelUrl}`);
  console.log(`   Username: user_${order.invoice_id}`);
}

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Full Automated Pterodactyl Order System`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`🌐 Site URL: ${config.urls.site}`);
  console.log(`📊 Database: ${config.database.path}`);
  console.log(`⚡ Payment Gateway: Duitku API Active`);
  console.log(`🎮 Pterodactyl: Connected to ${config.pterodactyl.domain}`);
});

module.exports = app;
