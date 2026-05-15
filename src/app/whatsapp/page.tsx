'use client';

import { useEffect } from 'react';

const WhatsAppRedirect = () => {
  const whatsappUrl = "https://wa.me/972526554868";

  useEffect(() => {
    // ניסיון ראשון: הפניה אוטומטית מהירה
    // replace עדיף על href כי הוא לא משאיר את העמוד הנוכחי בהיסטוריה
    window.location.replace(whatsappUrl);

    // ניסיון שני: גיבוי למקרה שהראשון נחסם על ידי הדפדפן
    const timeout = setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h2 style={{ color: '#25D366', marginBottom: '10px' }}>מעביר אותך לוואטסאפ...</h2>
      <p style={{ marginBottom: '20px' }}>מיד תיפתח שיחה עם עמרי רוח-מדבר.</p>
      
      {/* כפתור גיבוי - למקרה שההפניה האוטומטית נחסמה */}
      <a 
        href={whatsappUrl}
        style={{
          backgroundColor: '#25D366',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '25px',
          textDecoration: 'none',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        לחץ כאן אם לא עברת אוטומטית
      </a>
    </div>
  );
};

export default WhatsAppRedirect;