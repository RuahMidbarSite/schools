'use client';

import { useEffect } from 'react';

const WhatsAppRedirect = () => {
  useEffect(() => {
    // הקישור הישיר לוואטסאפ שלך
    const whatsappUrl = "https://wa.me/972526554868";
    
    // ביצוע ההפניה מיד עם טעינת הדף
    window.location.href = whatsappUrl;
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl'
    }}>
      <p>מעביר אותך לוואטסאפ של עמרי...</p>
    </div>
  );
};

export default WhatsAppRedirect;