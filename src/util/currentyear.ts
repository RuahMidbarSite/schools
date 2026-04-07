import { HDate, gematriya } from '@hebcal/core';

//מחזיר את השנה העברית הנוכחית באופן נקי (ללא גרשיים)
export function getSystemHebrewYear() {
  const today = new HDate();
  
  const yearWithoutThousands = today.getFullYear() % 1000;
  const cleanYear = gematriya(yearWithoutThousands).replace(/["״]/g, '');
  return cleanYear;
}

// שימוש בקבוע במערכת:
export const CURRENT_HEBREW_YEAR = getSystemHebrewYear();
