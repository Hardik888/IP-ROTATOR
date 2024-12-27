import axios from 'axios'
import tunnel from 'tunnel'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export async function handler(event, context) {

 context.callbackWaitsForEmptyEventLoop = false;

  const log = (message, data = null) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.stringify(data) : null
    }));
  };
  // preflight-request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    }
  }

  try {
    log('Starting proxy IP verification');
    // Add The below config from your proxy provider
    const proxyConfig = {
      host: process.env.proxy_host,
      port: process.env.proxy_port,
      username: process.env.proxy_user,
      password: process.env.proxy_pass
    }
    // easy agent creation for utilizing the proxyconfig 
    // an example would be how you add a proxy in postman via going into settings
    const proxyAgent = tunnel.httpsOverHttp({
      proxy: {
        host: proxyConfig.host,
        port: proxyConfig.port,
        proxyAuth: `${proxyConfig.username}:${proxyConfig.password}`
      }
    });

    const axiosInstance = axios.create({
      httpsAgent: proxyAgent,
      proxy: false,
      timeout: 5000, 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const ipResponse = await axiosInstance.get('https://api.ipify.org?format=json');
    const proxyIP = ipResponse.data.ip;

    log('Proxy IP verified', { proxyIP });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proxyIP,
        message: 'Proxy IP successfully retrieved'
      }),
    }

  } catch (error) {
    log('Error in proxy verification', { 
      message: error.message, 
      stack: error.stack 
    });
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Proxy verification failed', 
        details: error.message
      }),
    }
  }
}
