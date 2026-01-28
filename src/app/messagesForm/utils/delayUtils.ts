// ========================================
// delayUtils.ts
// פונקציות עזר לחישוב Delays חכמים בשליחת הודעות WhatsApp
// ========================================

/**
 * מחשב delay רנדומלי בין הודעות לאנשי קשר
 * הזמן משתנה בהתאם לכמות ההודעות הכוללת
 * 
 * @param totalMessages - סה"כ הודעות שיישלחו
 * @param currentIndex - אינדקס ההודעה הנוכחית (0-based)
 * @returns זמן המתנה במילישניות
 */
export function getSmartMessageDelay(totalMessages: number, currentIndex: number): number {
  let min: number, max: number;
  
  // ========================================
  // קביעת טווח הזמנים לפי כמות ההודעות
  // ========================================
  if (totalMessages <= 50) {
    // כמויות קטנות: 3-8 שניות
    min = 3000;
    max = 8000;
  } else if (totalMessages <= 200) {
    // כמויות בינוניות: 5-15 שניות
    min = 5000;
    max = 15000;
  } else {
    // כמויות גדולות: 10-25 שניות
    min = 10000;
    max = 25000;
  }
  
  // ========================================
  // הוספת פאוזות ארוכות כל 10 הודעות (נראה טבעי יותר)
  // ========================================
  if (currentIndex > 0 && currentIndex % 10 === 0) {
    min += 5000;  // +5 שניות
    max += 10000; // +10 שניות
    console.log(`🔔 Milestone: Every 10 messages - adding longer pause`);
  }
  
  // ========================================
  // 10% סיכוי לפאוזה ארוכה נוספת (כאילו המשתמש עשה הפסקה)
  // ========================================
  if (Math.random() < 0.1) {
    min += 20000; // +20 שניות
    max += 40000; // +40 שניות
    console.log(`☕ Random break: Adding extra long pause`);
  }
  
  // חישוב הזמן הסופי
  return Math.random() * (max - min) + min;
}

/**
 * מעצב הודעת המתנה ידידותית למשתמש
 * 
 * @param delayMs - זמן המתנה במילישניות
 * @returns מחרוזת מעוצבת עם הזמן
 */
export function formatDelayMessage(delayMs: number): string {
  const totalSeconds = Math.floor(delayMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * בדיקת מגבלה יומית (אופציונלי - להוסיף אם צריך)
 * 
 * @param maxDaily - מקסימום הודעות ביום
 * @returns true אם ניתן לשלוח, false אם הגעת למגבלה
 */
export function checkDailyLimit(maxDaily: number = 500): boolean {
  if (typeof window === 'undefined') return true; // Server-side
  
  const today = new Date().toDateString();
  const storageKey = `msg_count_${today}`;
  const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  
  if (count >= maxDaily) {
    console.warn(`⚠️ Daily limit reached: ${count}/${maxDaily} messages`);
    return false;
  }
  
  // עדכן את המונה
  localStorage.setItem(storageKey, String(count + 1));
  return true;
}

/**
 * מחשב זמן משוער לסיום השליחה
 * 
 * @param totalMessages - סה"כ הודעות
 * @param currentIndex - אינדקס נוכחי
 * @param averageDelay - ממוצע delay (אופציונלי)
 * @returns זמן משוער בדקות
 */
export function estimateRemainingTime(
  totalMessages: number, 
  currentIndex: number,
  averageDelay?: number
): string {
  const remaining = totalMessages - currentIndex - 1;
  
  // אם לא ניתן average, חשב לפי הטווח
  if (!averageDelay) {
    if (totalMessages <= 50) {
      averageDelay = 5500; // ממוצע של 3-8 שניות
    } else if (totalMessages <= 200) {
      averageDelay = 10000; // ממוצע של 5-15 שניות
    } else {
      averageDelay = 17500; // ממוצע של 10-25 שניות
    }
  }
  
  const totalMs = remaining * averageDelay;
  const totalMinutes = Math.ceil(totalMs / 60000);
  
  if (totalMinutes < 1) return 'פחות מדקה';
  if (totalMinutes === 1) return 'כדקה';
  if (totalMinutes < 60) return `כ-${totalMinutes} דקות`;
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `כ-${hours} שעות ו-${mins} דקות`;
}

/**
 * פונקציית עזר - sleep
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));