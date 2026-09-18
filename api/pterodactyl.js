const axios = require('axios');
const config = require('../config');

class PterodactylAPI {
  constructor() {
    this.baseURL = config.pterodactyl.domain;
    this.token = config.pterodactyl.clientToken;
    this.egg = config.pterodactyl.egg;
    this.location = config.pterodactyl.location;
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async createServer(orderData) {
    try {
      const serverData = {
        root_user: '1', // Admin user ID
        identifier: `${orderData.invoiceId}-${Date.now()}`,
        name: `Server ${orderData.customerName} - ${orderData.invoiceId}`,
        node: String(this.location),
        egg: String(this.egg),
        docker_image: 'ghcr.io/pterodactyl/alpine:latest',
        startups: './bin/start.sh',
        environment: {},
        limits: {
          memory: orderData.ram,
          swap: -1,
          disk: orderData.disk,
          io: 500,
          cpu: orderData.cpu,
        },
        features: {
          scheduled_tasks: false,
        },
        backup: null,
        allocation: {
          mode: 'random',
        },
      };

      const response = await this.api.post('/api/application/servers', serverData, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data,
        serverId: response.data.attributes.identifier,
        panelUrl: `${this.baseURL}/app/servers/${response.data.attributes.uuid}`
      };
    } catch (error) {
      console.error('Pterodactyl API Error:', error.response?.data || error.message);
      throw new Error(`Failed to create Pterodactyl server: ${error.message}`);
    }
  }

  async getServerInfo(serverUuid) {
    try {
      const response = await this.api.get(`/api/application/servers/${serverUuid}`);
      return response.data;
    } catch (error) {
      console.error('Get Server Info Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async startServer(serverUuid) {
    try {
      const response = await this.api.post(`/api/application/servers/${serverUuid}/start`);
      return response.data;
    } catch (error) {
      console.error('Start Server Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async stopServer(serverUuid) {
    try {
      const response = await this.api.post(`/api/application/servers/${serverUuid}/stop`);
      return response.data;
    } catch (error) {
      console.error('Stop Server Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteServer(serverUuid) {
    try {
      const response = await this.api.delete(`/api/application/servers/${serverUuid}`);
      return response.data;
    } catch (error) {
      console.error('Delete Server Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new PterodactylAPI();
