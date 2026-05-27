import React from 'react';

// 🎨 פונקציה דינמית ליצירת צבע ייחודי לכל ערך
const getStatusColor = (status: string) => {
  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    // שימוש באלגוריתם ערבול חזק יותר כדי לייצר שונות גבוהה גם לסטטוסים בעלי תחילית זהה
    hash = (hash * 31) + status.charCodeAt(i) + (i * 13);
    hash = hash & hash; // ממיר ל-32bit integer למניעת גלישה
  }
  
  // פלטת צבעים מורחבת מאד (30 צבעים) לפיזור מיטבי
  const colors = [
    { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },  // 1. כחול
    { bg: '#eef2ff', text: '#3730a3', border: '#a5b4fc' },  // 2. אינדיגו
    { bg: '#fdf2f8', text: '#831843', border: '#f9a8d4' },  // 3. ורוד
    { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },  // 4. אמרלד (ירוק-כחול)
    { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },  // 5. ענבר (צהוב-כתום)
    { bg: '#faf5ff', text: '#581c87', border: '#d8b4fe' },  // 6. סגול
    { bg: '#fff7ed', text: '#7c2d12', border: '#fdba74' },  // 7. כתום
    { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },  // 8. אדום
    { bg: '#f0fdfa', text: '#134e4a', border: '#5eead4' },  // 9. טורקיז
    { bg: '#f0f9ff', text: '#075985', border: '#7dd3fc' },  // 10. שמיים (תכלת)
    { bg: '#f7fee7', text: '#3f6212', border: '#bef264' },  // 11. ליים
    { bg: '#ecfeff', text: '#164e63', border: '#67e8f9' },  // 12. ציאן
    { bg: '#fdf4ff', text: '#701a75', border: '#f0abfc' },  // 13. פוקסיה
    { bg: '#fff1f2', text: '#881337', border: '#fda4af' },  // 14. ורוד-אדום (Rose)
    { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' },  // 15. צפחה (אפור-כחלחל)
    { bg: '#fefce8', text: '#713f12', border: '#fde047' },  // 16. צהוב
    { bg: '#f0fdf4', text: '#14532d', border: '#86efac' },  // 17. ירוק
    { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },  // 18. אפרסק
    { bg: '#f9fafb', text: '#1f2937', border: '#d1d5db' },  // 19. אפור
    { bg: '#f5f3ff', text: '#4c1d95', border: '#c4b5fd' },  // 20. ויולט (סגול-כחול)
    { bg: '#fafafa', text: '#27272a', border: '#e4e4e7' },  // 21. אבץ (אפור ניטרלי)
    { bg: '#fafaf9', text: '#292524', border: '#d6d3d1' },  // 22. אבן (אפור חם)
    { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },  // 23. תכלת עמוק
    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },  // 24. מנטה (ירוק בהיר)
    { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },  // 25. אלמוג (אדום-כתום)
    { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },  // 26. לבנדר
    { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },  // 27. זהב
    { bg: '#ecfccb', text: '#4d7c0f', border: '#d9f99d' },  // 28. זית (ירוק-צהוב)
    { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },  // 29. רויאל (כחול כהה)
    { bg: '#fce7f3', text: '#be185d', border: '#fbcfe8' },  // 30. מגנטה
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