"use server";
import prisma from "@/db/prisma";
import { Program, Program_Schedule } from "@prisma/client";

// --- פונקציית המחיקה הקריטית ---
// וודא שפונקציה זו קיימת בקובץ!
export const deletePrograms = async (ids: number[]) => {
  "use server";
  console.log("🚀 Server attempting to delete programs with IDs:", ids);
  
  if (!ids || ids.length === 0) return;

  try {
    // מחיקה לפי Programid
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

// --- עדכון עמודה (כולל תמיכה בבחירה מרובה) ---
export const updateProgramsColumn = async (ColumnName: string, newValue: any, key: number): Promise<any> => {
  "use server";
  
  let valueToSave = newValue;
  // המרת מערך למחרוזת
  if (Array.isArray(newValue)) {
    valueToSave = newValue.join(", ");
  }

  var data: any = {};
  data[ColumnName] = valueToSave;
  
  await prisma.program.updateMany({
    where: { Programid: key },
    data: data,
  });
};

// --- שאר הפונקציות (ללא שינוי, נדרשות לפעילות תקינה) ---

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