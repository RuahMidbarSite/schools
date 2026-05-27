import React from 'react';

// 🎨 פונקציה דינמית ליצירת צבע ייחודי לכל ערך
const getStatusColor = (status: string) => {
  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    // הוספת 'i' לחישוב כדי להגביר רגישות למיקום התווים ולמנוע התנגשויות
    hash = status.charCodeAt(i) + ((hash << 5) - hash) + i;
  }
  
  // פלטת צבעים מורחבת (20 צבעים) להקטנת סיכוי לכפילויות
  const colors = [
    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },  // כחול
    { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },  // סגול-כחול
    { bg: '#fce7f3', text: '#831843', border: '#f9a8d4' },  // ורוד
    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },  // ירוק (Emerald)
    { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },  // צהוב (Amber)
    { bg: '#f3e8ff', text: '#581c87', border: '#d8b4fe' },  // סגול
    { bg: '#fed7aa', text: '#7c2d12', border: '#fdba74' },  // כתום
    { bg: '#fecaca', text: '#991b1b', border: '#fca5a5' },  // אדום בהיר
    { bg: '#ccfbf1', text: '#134e4a', border: '#5eead4' },  // טורקיז
    { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },  // תכלת
    { bg: '#ecfccb', text: '#3f6212', border: '#bef264' },  // ליים
    { bg: '#cffafe', text: '#164e63', border: '#67e8f9' },  // ציאן
    { bg: '#fae8ff', text: '#701a75', border: '#f0abfc' },  // פוקסיה
    { bg: '#ffe4e6', text: '#881337', border: '#fda4af' },  // ורוד-אדום (Rose)
    { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },  // אפור-כחול (Slate)
    { bg: '#fef08a', text: '#713f12', border: '#fde047' },  // צהוב בהיר
    { bg: '#dcfce7', text: '#14532d', border: '#86efac' },  // ירוק בהיר
    { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },  // אפרסק
    { bg: '#e2e8f0', text: '#1e293b', border: '#94a3b8' },  // אפור
    { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' },  // סגול כהה (Violet)
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
export const StatusBadgeRenderer = (params: any) => {
  console.log("🎯 StatusBadgeRenderer called!", params.value); // ← debug
  
  if (!params.value) return null;
  
  const value = params.value.toString().trim();
  
  // קבלת הצבע בצורה דינמית לפי הטקסט
  const colors = getStatusColor(value);

  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {value}
    </span>
  );
};