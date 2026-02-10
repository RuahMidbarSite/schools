import React from 'react';

// רשימת הצבעים האפשריים מה-CSS שלך
const BADGE_COLORS = [
  "custom-badge-success",  // ירוק
  "custom-badge-warning",  // כתום
  "custom-badge-danger",   // אדום
  "custom-badge-info",     // כחול
  "custom-badge-primary",  // טורקיז
  "custom-badge-neutral"   // אפור
];

/**
 * פונקציה שממירה מחרוזת למספר עקבי
 * "Active" תמיד יחזיר אותו מספר, ולכן תמיד יקבל אותו צבע
 */
const getColorClass = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    // אלגוריתם פשוט לערבוב תווים למספר ייחודי
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // הופך את המספר לחיובי ובוחר אינדקס מתוך רשימת הצבעים
  const index = Math.abs(hash) % BADGE_COLORS.length;
  return BADGE_COLORS[index];
};

export const StatusBadgeRenderer = (params: any) => {
  if (!params.value) return null;
  
  const value = params.value.toString().trim();
  
  // קבלת הצבע בצורה דינמית לפי הטקסט
  const badgeClass = getColorClass(value);

  return (
    <span 
      className={`custom-badge ${badgeClass}`}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: 'fit-content',
        minWidth: '70px' // רוחב מינימלי כדי שזה יראה אחיד
      }}
    >
      {value}
    </span>
  );
};