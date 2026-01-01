"use server";
import prisma from "@/db/prisma";
import { Program } from "@prisma/client";

// --- פונקציית המחיקה ---
export const deletePrograms = async (ids: number[]) => {
  "use server";
  console.log("🚀 Server attempting to delete programs with IDs:", ids);
  
  if (!ids || ids.length === 0) return;

  try {
    const result = await prisma.program.deleteMany({
      where: { 
        Programid: { 
          in: ids 
        } 
      }
    });
    console.log("✅ Deleted count:", result.count);
    return result;
  } catch (error) {
    console.error("❌ Error executing deletePrograms:", error);
    throw error;
  }
};

// --- עדכון עמודה (מתוקן: המרה למספרים ומיפוי שמות) ---
export const updateProgramsColumn = async (ColumnName: string, newValue: any, key: number): Promise<any> => {
  "use server";
  
  console.log(`📝 Update Request -> ID: ${key}, Col: ${ColumnName}, Val: ${newValue}`);

  // 1. מיפוי שמות עמודות (Area -> District)
  let dbColumnName = ColumnName;
  if (ColumnName === "Area") {
      dbColumnName = "District";
  }

  let valueToSave = newValue;

  // 2. טיפול במערכים (הופך למחרוזת)
  if (Array.isArray(newValue)) {
    valueToSave = newValue.join(", ");
  }

  // 3. טיפול בשדות מספריים (String -> Int)
  // רשימת כל השדות שמוגדרים כ-Int ב-Schema
  const intFields = [
      "Weeks", 
      "LessonsPerDay", 
      "PaidLessonNumbers", 
      "PricingPerPaidLesson", 
      "FreeLessonNumbers", 
      "AdditionalPayments"
  ];

  if (intFields.includes(dbColumnName)) {
      if (valueToSave === "" || valueToSave === null || valueToSave === undefined) {
          valueToSave = null; // אם ריק, נשמור כ-null
      } else {
          // המרה למספר שלם
          valueToSave = parseInt(valueToSave);
          
          // בדיקת תקינות (למנוע קריסה אם המשתמש הזין טקסט לא חוקי)
          if (isNaN(valueToSave)) {
              valueToSave = null; 
          }
      }
  }

  // יצירת אובייקט העדכון
  var data: any = {};
  data[dbColumnName] = valueToSave;
  
  try {
      await prisma.program.updateMany({
        where: { Programid: key },
        data: data,
      });
      console.log(`✅ Update Success: Field '${dbColumnName}' updated to`, valueToSave);
  } catch (error) {
      console.error(`❌ Update Failed for field '${dbColumnName}':`, error);
      throw error; 
  }
};

// --- שליפת נתונים ---

export const getPrograms = async (): Promise<Program[]> => {
  "use server";
  return prisma.program.findMany({ orderBy: { Programid: "asc" }, take: 10000 });
};

export const addProgramsRows = async (data: Program[]) => {
  "use server";
  var queries = [];
  for (let i = 0; i < data.length; i++) {
    queries.push(prisma.program.create({ data: data[i] }));
  }
  await Promise.all([...queries]);
};

export const getAllProgramsData = async () => {
  "use server";
  try {
    const [Programs, Schools, schoolsContacts, ProgramsStatuses, Years] = await Promise.all([
      prisma.program.findMany({ take: 10000, orderBy: { Programid: 'asc' } }),
      prisma.school.findMany(),
      prisma.schoolsContact.findMany(),
      prisma.statusPrograms.findMany(),
      prisma.years.findMany()
    ]);

    const masterColumnKeys = ["Programid", "ProgramName", "SchoolName", "CityName", "Year", "Status", "SchoolsContact", "ChosenDay"];
    const Tablemodel = [masterColumnKeys, masterColumnKeys];

    return { Programs, Schools, schoolsContacts, ProgramsStatuses, Years, Tablemodel };
  } catch (error) {
    console.error("Server Error:", error);
    return null;
  }
};