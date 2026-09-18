const axios = require('axios');
const FormData = require('form-data');
const QRCode = require('qrcode');
const config = require('../config');

class DuitkuAPI {
  constructor() {
    this.apiKey = config.duitku.apiKey;
    this.merchantCode = config.duitku.merchantCode;
    this.baseURL = 'https://api.duitku.com/v2';
    
    this.api = axios.create({
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async createCharge(orderData) {
    try {
      const formData = new FormData();
      formData.append('merchant_code', this.merchantCode);
      formData.append('reference_no', orderData.invoiceId);
      formData.append('amount', orderData.amount.toString());
      formData.append('mobile', orderData.customerPhone || '');
      formData.append('email', orderData.customerEmail);
      formData.append('product_name', `Server ${orderData.packageName}`);
      formData.append('callback_url', `${config.urls.site}/api/webhooks/payment`);
      formData.append('finish_url', `${config.urls.site}/success/${orderData.invoiceId}`);

      const response = await axios.post(
        `${this.baseURL}/charges/create-charges-list-in-app`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.status === true) {
        return {
          success: true,
          data: response.data.data,
          charges: response.data.data.charges_list[0]
        };
      } else {
        throw new Error(response.data?.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Duitku Create Charge Error:', error.response?.data || error.message);
      throw new Error(`Failed to create charge: ${error.message}`);
    }
  }

  async checkPaymentStatus(transactionId) {
    try {
      const response = await this.api.get('/payments/check-payment-status', {
        params: {
          merchant_code: this.merchantCode,
          reference_no: transactionId
        }
      });

      return response.data;
    } catch (error) {
      console.error('Check Payment Status Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getQRIS() {
    try {
      const response = await this.api.get('/get-qris/');
      
      if (response.data && response.data.status === true) {
        return {
          success: true,
          qris: response.data.data.qris_cd64
        };
      } else {
        throw new Error(response.data?.message || 'Failed to generate QRIS');
      }
    } catch (error) {
      console.error('Get QRIS Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateQRCode(dataUrl) {
    try {
      const qrBuffer = await QRCode.toBuffer(dataUrl, {
        type: 'png',
        width: 500,
        margin: 2,
        scale: 4
      });
      return qrBuffer.toString('base64');
    } catch (error) {
      console.error('Generate QR Code Error:', error.message);
      throw error;
    }
  }
}

module.exports = new DuitkuAPI();
