#!/usr/bin/env node

/**
 * 🔍 סקריפט בדיקה לאבחון בעיות WhatsApp + ngrok + Vercel
 * 
 * הרץ את הסקריפט הזה כדי לזהות את הבעיה המדויקת
 */

const https = require('https');
const http = require('http');

// 🔴 שנה את הכתובות האלה לכתובות שלך
const NGROK_URL = 'https://beamingly-footworn-johnsie.ngrok-free.dev'; // כתובת ngrok שלך
const LOCALHOST_URL = 'http://localhost:3994'; // הפורט של השרת המקומי

console.log('🔍 מתחיל בדיקות אבחון...\n');
console.log('=' .repeat(60));

// פונקציה לביצוע בקשה
function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Diagnostic-Tool/1.0',
        ...headers
      },
      timeout: 10000
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// בדיקה 1: חיבור ללוקל הוסט
async function testLocalhost() {
  console.log('\n📍 בדיקה 1: חיבור לשרת מקומי (localhost)');
  console.log('-'.repeat(60));
  
  try {
    const result = await makeRequest(`${LOCALHOST_URL}/status`);
    console.log('✅ התחברות לשרת מקומי: הצליח');
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Response: ${result.body.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.log('❌ התחברות לשרת מקומי: נכשל');
    console.log(`   שגיאה: ${error.message}`);
    console.log('   💡 פתרון: ודא שהשרת רץ על פורט 3994');
    return false;
  }
}

// בדיקה 2: חיבור ל-ngrok
async function testNgrok() {
  console.log('\n📍 בדיקה 2: חיבור ל-ngrok');
  console.log('-'.repeat(60));
  
  if (NGROK_URL === 'https://your-ngrok-url.ngrok-free.app') {
    console.log('⚠️  נא לעדכן את NGROK_URL בראש הקובץ');
    return false;
  }
  
  try {
    const result = await makeRequest(`${NGROK_URL}/status`);
    console.log('✅ התחברות ל-ngrok: הצליח');
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Response: ${result.body.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.log('❌ התחברות ל-ngrok: נכשל');
    console.log(`   שגיאה: ${error.message}`);
    console.log('   💡 פתרון: ודא ש-ngrok רץ ומצביע לפורט 3994');
    return false;
  }
}

// בדיקה 3: CORS Headers
async function testCORS() {
  console.log('\n📍 בדיקה 3: בדיקת CORS Headers');
  console.log('-'.repeat(60));
  
  try {
    // OPTIONS request (preflight)
    const optionsResult = await makeRequest(`${NGROK_URL}/status`, 'OPTIONS', {
      'Origin': 'https://schools-rho-ashen.vercel.app',
      'Access-Control-Request-Method': 'GET'
    });
    
    console.log('✅ OPTIONS Request (Preflight): הצליח');
    console.log(`   Status Code: ${optionsResult.statusCode}`);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': optionsResult.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': optionsResult.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': optionsResult.headers['access-control-allow-headers']
    };
    
    console.log('   CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${value || 'חסר!'}`);
    });
    
    // GET request עם Origin
    const getResult = await makeRequest(`${NGROK_URL}/status`, 'GET', {
      'Origin': 'https://schools-rho-ashen.vercel.app'
    });
    
    const allowOrigin = getResult.headers['access-control-allow-origin'];
    console.log(`\n   GET Request עם Origin:`);
    console.log(`   ${allowOrigin ? '✅' : '❌'} Access-Control-Allow-Origin: ${allowOrigin || 'חסר!'}`);
    
    return !!(corsHeaders['Access-Control-Allow-Origin'] && allowOrigin);
    
  } catch (error) {
    console.log('❌ בדיקת CORS: נכשל');
    console.log(`   שגיאה: ${error.message}`);
    return false;
  }
}

// בדיקה 4: Initialize Endpoint
async function testInitialize() {
  console.log('\n📍 בדיקה 4: בדיקת /Initialize endpoint');
  console.log('-'.repeat(60));
  
  try {
    console.log('⏳ שולח בקשה ל-/Initialize (timeout: 10 שניות)...');
    const startTime = Date.now();
    
    const result = await makeRequest(`${NGROK_URL}/Initialize`);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ /Initialize הגיב תוך ${duration} שניות`);
    console.log(`   Status Code: ${result.statusCode}`);
    
    try {
      const json = JSON.parse(result.body);
      console.log(`   Response type: ${json.result || 'unknown'}`);
      
      if (json.result === 'qr') {
        console.log(`   ✅ קיבלנו QR code (${json.data?.substring(0, 50)}...)`);
      } else if (json.result === 'ready') {
        console.log(`   ✅ WhatsApp כבר מחובר`);
      } else if (json.result === 'connecting') {
        console.log(`   ⏳ WhatsApp מנסה להתחבר`);
      }
    } catch (e) {
      console.log(`   Response: ${result.body.substring(0, 200)}`);
    }
    
    return result.success;
    
  } catch (error) {
    console.log('❌ /Initialize: נכשל או timeout');
    console.log(`   שגיאה: ${error.message}`);
    console.log('   💡 בעיה אפשרית: הבקשה לוקחת יותר מדי זמן');
    return false;
  }
}

// בדיקה 5: ngrok Headers
async function testNgrokHeaders() {
  console.log('\n📍 בדיקה 5: בדיקת ngrok Headers');
  console.log('-'.repeat(60));
  
  try {
    const result = await makeRequest(`${NGROK_URL}/status`);
    
    const ngrokHeaders = {
      'ngrok-trace-id': result.headers['ngrok-trace-id'],
      'x-forwarded-for': result.headers['x-forwarded-for'],
      'x-forwarded-proto': result.headers['x-forwarded-proto']
    };
    
    console.log('Headers שחוזרים מ-ngrok:');
    Object.entries(ngrokHeaders).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '⚠️ '} ${key}: ${value || 'לא קיים'}`);
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ בדיקת Headers: נכשל');
    return false;
  }
}

// בדיקה 6: גודל Response
async function testResponseSize() {
  console.log('\n📍 בדיקה 6: בדיקת גודל Response');
  console.log('-'.repeat(60));
  
  try {
    const result = await makeRequest(`${NGROK_URL}/Initialize`);
    const sizeKB = (result.body.length / 1024).toFixed(2);
    
    console.log(`   Response Size: ${sizeKB} KB`);
    
    if (result.body.length > 100000) {
      console.log('   ⚠️  Response גדול מאוד (>100KB) - זה יכול לגרום לבעיות');
    } else {
      console.log('   ✅ Response בגודל סביר');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ בדיקת גודל: נכשל');
    return false;
  }
}

// הרצת כל הבדיקות
async function runAllTests() {
  console.log('\n🚀 מתחיל סדרת בדיקות מלאה\n');
  
  const results = {
    localhost: await testLocalhost(),
    ngrok: await testNgrok(),
    cors: await testCORS(),
    initialize: await testInitialize(),
    ngrokHeaders: await testNgrokHeaders(),
    responseSize: await testResponseSize()
  };
  
  // סיכום
  console.log('\n' + '='.repeat(60));
  console.log('📊 סיכום תוצאות:');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} ${test}: ${passed ? 'עבר' : 'נכשל'}`);
  });
  
  // המלצות
  console.log('\n' + '='.repeat(60));
  console.log('💡 המלצות לתיקון:');
  console.log('='.repeat(60));
  
  if (!results.localhost) {
    console.log('1. ❌ השרת המקומי לא רץ - הפעל את השרת ב-localhost:3994');
  }
  
  if (!results.ngrok) {
    console.log('2. ❌ ngrok לא עובד - ודא ש-ngrok רץ ומצביע לפורט הנכון');
    console.log('   הרץ: ngrok http 3994');
  }
  
  if (!results.cors) {
    console.log('3. ❌ בעיית CORS - צריך להוסיף Headers ידניים לשרת');
    console.log('   השתמש בקוד המתוקן שסיפקתי');
  }
  
  if (!results.initialize) {
    console.log('4. ❌ /Initialize לוקח יותר מדי זמן או נכשל');
    console.log('   צריך לשנות ל-polling במקום Promise ארוך');
  }
  
  if (results.localhost && results.ngrok && results.cors && !results.initialize) {
    console.log('\n🎯 הבעיה העיקרית: /Initialize לוקח יותר מדי זמן!');
    console.log('   הפתרון: שנה את הלוגיקה ל-polling במקום המתנה ארוכה');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ בדיקות הסתיימו!\n');
}

// הרצה
runAllTests().catch(console.error);
