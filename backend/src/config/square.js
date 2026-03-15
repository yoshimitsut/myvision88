const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const squareApiClient = axios.create({
  baseURL: process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com',
  headers: {
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Square-Version': '2024-01-01' // Use a versão mais recente
  }
});

module.exports = { squareApiClient };