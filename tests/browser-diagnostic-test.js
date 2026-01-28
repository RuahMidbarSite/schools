/**
 * 🔍 סקריפט בדיקה לקונסולת הדפדפן (Vercel)
 * 
 * העתק את הקוד הזה לקונסולת הדפדפן באתר Vercel שלך
 * ושנה את NGROK_URL לכתובת שלך
 */

const NGROK_URL = 'https://your-ngrok-url.ngrok-free.app'; // 🔴 שנה כאן!

console.log('🔍 מתחיל בדיקות מהדפדפן...\n');

// פונקציה לביצוע בקשה עם פרטים מלאים
async function testRequest(endpoint, method = 'GET', body = null) {
  const url = `${NGROK_URL}${endpoint}`;
  console.log(`\n📡 בודק: ${method} ${endpoint}`);
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    console.log(`✅ התשובה הגיעה תוך ${duration}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`);
    
    // הצג Headers חשובים
    const importantHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'content-type',
      'ngrok-trace-id'
    ];
    
    importantHeaders.forEach(header => {
      const value = response.headers.get(header);
      const emoji = value ? '✅' : '❌';
      console.log(`   ${emoji} ${header}: ${value || 'חסר'}`);
    });
    
    // נסה לקרוא את ה-body
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(`\n   📦 Response Body:`, data);
    } else {
      const text = await response.text();
      console.log(`\n   📦 Response Body (text):`, text.substring(0, 200));
    }
    
    return {
      success: response.ok,
      status: response.status,
      duration: duration,
      data: data,
      headers: Object.fromEntries(response.headers.entries())
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ שגיאה (${duration}ms):`, error);
    console.error(`   סוג שגיאה: ${error.name}`);
    console.error(`   הודעה: ${error.message}`);
    
    // זיהוי סוג השגיאה
    if (error.message.includes('CORS')) {
      console.error(`\n   💡 זו בעיית CORS!`);
      console.error(`      הפתרון: הוסף Headers ידניים בשרת`);
    } else if (error.message.includes('network')) {
      console.error(`\n   💡 בעיית רשת - ngrok אולי לא רץ`);
    } else if (error.message.includes('timeout')) {
      console.error(`\n   💡 הבקשה לוקחת יותר מדי זמן`);
    }
    
    return {
      success: false,
      error: error.message,
      duration: duration
    };
  }
}

// פונקציה לבדיקת CORS Preflight
async function testCORSPreflight() {
  console.log(`\n🔍 בדיקה מיוחדת: CORS Preflight (OPTIONS)`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${NGROK_URL}/status`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    console.log(`✅ OPTIONS request הצליח`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers שחזרו:`);
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers.get(header);
      const emoji = value ? '✅' : '❌';
      console.log(`   ${emoji} ${header}: ${value || 'חסר!'}`);
    });
    
    return response.ok;
    
  } catch (error) {
    console.error(`❌ OPTIONS request נכשל:`, error.message);
    return false;
  }
}

// סדרת בדיקות מלאה
async function runBrowserTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 מתחיל בדיקות מהדפדפן');
  console.log('='.repeat(60));
  
  const results = {};
  
  // בדיקה 1: OPTIONS (CORS Preflight)
  console.log('\n\n1️⃣ בדיקת CORS Preflight');
  results.preflight = await testCORSPreflight();
  
  // בדיקה 2: /status
  console.log('\n\n2️⃣ בדיקת /status endpoint');
  results.status = await testRequest('/status', 'GET');
  
  // בדיקה 3: /Initialize (עם timeout)
  console.log('\n\n3️⃣ בדיקת /Initialize endpoint (עד 10 שניות)');
  const initPromise = testRequest('/Initialize', 'GET');
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
  );
  
  try {
    results.initialize = await Promise.race([initPromise, timeoutPromise]);
  } catch (error) {
    console.error('❌ /Initialize לקח יותר מ-10 שניות (timeout)');
    results.initialize = { success: false, error: 'timeout' };
  }
  
  // סיכום
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 סיכום תוצאות:');
  console.log('='.repeat(60));
  
  console.log(`\n1️⃣ CORS Preflight: ${results.preflight ? '✅ עבר' : '❌ נכשל'}`);
  console.log(`2️⃣ /status: ${results.status?.success ? '✅ עבר' : '❌ נכשל'}`);
  console.log(`3️⃣ /Initialize: ${results.initialize?.success ? '✅ עבר' : '❌ נכשל'}`);
  
  // אבחון הבעיה
  console.log('\n' + '='.repeat(60));
  console.log('🔍 אבחון הבעיה:');
  console.log('='.repeat(60));
  
  if (!results.preflight) {
    console.log('\n❌ בעיה 1: CORS Preflight נכשל');
    console.log('   הפתרון: הוסף middleware ידני ל-CORS בשרת:');
    console.log(`
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    });
    `);
  }
  
  if (!results.status?.success && results.preflight) {
    console.log('\n❌ בעיה 2: /status נכשל אבל CORS עובד');
    console.log('   הבעיה: ngrok או השרת לא זמינים');
    console.log('   ודא ש-ngrok רץ עם: ngrok http 3994');
  }
  
  if (results.initialize?.error === 'timeout') {
    console.log('\n❌ בעיה 3: /Initialize לוקח יותר מ-10 שניות!');
    console.log('   הבעיה: הפונקציה חוסמת ומחכה ל-QR או חיבור');
    console.log('   הפתרון: שנה ל-polling architecture:');
    console.log('   - /Initialize יחזיר מיד "connecting" אם יש session');
    console.log('   - הלקוח יעשה polling ל-/status כל כמה שניות');
    console.log('   - או הוסף endpoint /GetQR שלא חוסם');
  }
  
  if (results.status?.success && results.initialize?.success) {
    console.log('\n✅ הכל עובד! אין בעיות');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ בדיקות הסתיימו!');
  console.log('='.repeat(60));
  
  return results;
}

// הרץ את הבדיקות
console.log('\n⚠️  לפני שתמשיך, ודא ש:');
console.log('1. עדכנת את NGROK_URL בתחילת הקובץ');
console.log('2. ngrok רץ ומצביע ל-localhost:3994');
console.log('3. השרת המקומי רץ על פורט 3994\n');
console.log('📝 אם הכל מוכן, הרץ: runBrowserTests()');

// או הרץ אוטומטית:
// runBrowserTests();
