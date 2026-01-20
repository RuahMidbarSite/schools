"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// מיפוי של כל קטגוריה - איפה היא נמצאת בשימוש במערכת
// המפתח: שם הקולקציה (כפי שמופיע ב-page.tsx)
// הערך: מערך של בדיקות לביצוע (איזה מודל לבדוק ואיזה שדה לחפש)
const DEPENDENCIES: Record<string, { model: string; field: string; label: string }[]> = {
  Role: [
    { model: "schoolsContact", field: "Role", label: "אנשי קשר" }
  ],
  SchoolTypes: [
    { model: "school", field: "SchoolType", label: "בתי ספר" }
  ],
  ReligionSector: [
    { model: "school", field: "ReligiousSector", label: "בתי ספר" },
    { model: "guide", field: "ReligiousSector", label: "מדריכים" }
  ],
  EducationStage: [
    { model: "school", field: "EducationStage", label: "בתי ספר" },
    { model: "program", field: "EducationStage", label: "תוכניות" }
  ],
  ProductTypes: [
    { model: "program", field: "Product", label: "תוכניות" }
  ],
  Areas: [
    { model: "guide", field: "Area", label: "מדריכים" },
    { model: "recommender", field: "Area", label: "ממליצים" }
  ],
  StatusContacts: [
    { model: "schoolsContact", field: "Status", label: "אנשי קשר" }
  ],
  StatusGuides: [
    { model: "guide", field: "Status", label: "מדריכים" }
  ],
  StatusSchools: [
    { model: "school", field: "Status", label: "בתי ספר" }
  ],
  StatusPrograms: [
    { model: "program", field: "Status", label: "תוכניות" }
  ],
  Cities: [
    { model: "school", field: "City", label: "בתי ספר" },
    { model: "guide", field: "City", label: "מדריכים" }
  ]
};

/**
 * פונקציה למחיקת פריט הגדרה עם בדיקת תלויות
 * @param collectionName שם המודל ב-Prisma (למשל 'Role')
 * @param idField שם שדה ה-ID (למשל 'RoleId')
 * @param nameField שם שדה השם (למשל 'RoleName')
 * @param id הערך של ה-ID למחיקה
 */
export async function deleteSettingItem(
  collectionName: string,
  idField: string,
  nameField: string,
  id: number
) {
  try {
    // 1. שלוף את הפריט כדי לקבל את השם שלו (כי הטבלאות המקושרות שומרות שם, לא ID)
    // @ts-ignore - גישה דינמית ל-Prisma
    const itemToDelete = await prisma[collectionName].findUnique({
      where: { [idField]: id },
    });

    if (!itemToDelete) {
      return { success: false, error: "הפריט לא נמצא" };
    }

    const valueToCheck = itemToDelete[nameField];

    // 2. בדוק אם יש תלויות (האם השם הזה מופיע בטבלאות אחרות)
    const dependencies = DEPENDENCIES[collectionName];
    
    if (dependencies) {
      for (const dep of dependencies) {
        // @ts-ignore
        const count = await prisma[dep.model].count({
          where: { [dep.field]: valueToCheck }
        });

        if (count > 0) {
          return { 
            success: false, 
            error: `לא ניתן למחוק את "${valueToCheck}" כיוון שהוא משויך ל-${count} רשומות בטבלת ${dep.label}.` 
          };
        }
      }
    }

    // 3. אם הכל נקי - בצע מחיקה
    // @ts-ignore
    await prisma[collectionName].delete({
      where: { [idField]: id },
    });

    return { success: true };

  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, error: "אירעה שגיאה טכנית בעת המחיקה" };
  }
}