import React from 'react';

// 🎨 פונקציה דינמית ליצירת צבע ייחודי לכל ערך
const getStatusColor = (status: string) => {
  // יצירת hash מהמחרוזת
  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    hash = status.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // פלטת צבעים נעימה ועדינה
  const colors = [
    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },  // כחול
    { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },  // סגול-כחול
    { bg: '#fce7f3', text: '#831843', border: '#f9a8d4' },  // ורוד
    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },  // ירוק
    { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },  // צהוב
    { bg: '#f3e8ff', text: '#581c87', border: '#d8b4fe' },  // סגול
    { bg: '#fed7aa', text: '#7c2d12', border: '#fdba74' },  // כתום
    { bg: '#fecaca', text: '#991b1b', border: '#fca5a5' },  // אדום בהיר
    { bg: '#ccfbf1', text: '#134e4a', border: '#5eead4' },  // טורקיז
    { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },  // תכלת
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