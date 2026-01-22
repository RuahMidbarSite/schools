"use server";
import prisma from "@/db/prisma";
import { Program } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

// --- יצירת תוכנית חדשה (בודדת) ---
export const createProgram = async (data: any) => {
  "use server";
  try {
    if (!data.Programid) throw new Error("Missing Programid");

    const dataToSave = { ...data };
    if (dataToSave.Area) dataToSave.District = dataToSave.Area;
    delete dataToSave.Area;
    if (!dataToSave.CityName) dataToSave.CityName = null;

    const newProgram = await prisma.program.create({
      data: {
        Programid: dataToSave.Programid,
        Year: dataToSave.Year || "תשפד",
        Status: dataToSave.Status || "חדש",
        ...dataToSave 
      }
    });

    console.log(`✅ Created new program with ID: ${newProgram.Programid}`);
    return newProgram;
  } catch (error) {
    console.error("❌ Error creating program:", error);
    throw error;
  }
};

// --- שמירת מספר תוכניות חדשות בבת אחת (Batch Save) ---
export const saveNewPrograms = async (programs: any[]) => {
  "use server";
  try {
    const promises = programs.map((p) => {
        const dataToSave = { ...p };
        
        delete dataToSave.isNew; 
        
        if (dataToSave.Area) dataToSave.District = dataToSave.Area;
        delete dataToSave.Area; 
        
        // --- תיקון: טיפול ב lessonsPerDay ---
        if (dataToSave.lessonsPerDay !== undefined) {
             const val = parseInt(dataToSave.lessonsPerDay);
             dataToSave.LessonsPerDay = isNaN(val) ? null : val;
             delete dataToSave.lessonsPerDay;
        }
        if (dataToSave.LessonsPerDay !== undefined && dataToSave.LessonsPerDay !== null) {
            const val = parseInt(dataToSave.LessonsPerDay);
             dataToSave.LessonsPerDay = isNaN(val) ? null : val;
        }
        // ------------------------------------

        if (!dataToSave.CityName) dataToSave.CityName = null;

        const baseData = {
            Programid: dataToSave.Programid,
            Year: dataToSave.Year || "תשפד",
            Status: dataToSave.Status || "חדש",
        };

        return prisma.program.create({
            data: { ...baseData, ...dataToSave }
        });
    });

    await Promise.all(promises);
    console.log(`✅ Batch saved ${programs.length} programs successfully.`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error batch saving programs:", error);
    throw error;
  }
};

// --- מחיקת תוכניות ---
export const deletePrograms = async (ids: number[]) => {
  "use server";
  console.log("🚀 Server attempting to delete programs with IDs:", ids);
  
  if (!ids || ids.length === 0) return;

  try {
    const result = await prisma.program.deleteMany({
      where: { Programid: { in: ids } }
    });
    console.log("✅ Deleted count:", result.count);
    return result;
  } catch (error) {
    console.error("❌ Error executing deletePrograms:", error);
    throw error;
  }
};

// --- עדכון עמודה ---
export const updateProgramsColumn = async (ColumnName: string, newValue: any, key: number): Promise<any> => {
  "use server";
  console.log(`📝 Update Request -> ID: ${key}, Col: ${ColumnName}, Val: ${newValue}`);

  let dbColumnName = ColumnName;
  if (ColumnName === "Area") dbColumnName = "District";
  // תיקון: מיפוי ידני לשם תקין
  if (ColumnName === "lessonsPerDay") dbColumnName = "LessonsPerDay"; 

  let valueToSave = newValue;
  if (Array.isArray(newValue)) valueToSave = newValue.join(", ");
  if (dbColumnName === "Order" && (valueToSave === "" || valueToSave === undefined)) valueToSave = null;

  // תיקון: הוספת LessonsPerDay (אות גדולה) לרשימת המספרים
  const intFields = ["Weeks", "LessonsPerDay", "PaidLessonNumbers", "PricingPerPaidLesson", "FreeLessonNumbers", "AdditionalPayments"];
  
  if (intFields.includes(dbColumnName)) {
      if (valueToSave === "" || valueToSave === null || valueToSave === undefined) valueToSave = null; 
      else {
          valueToSave = parseInt(valueToSave);
          if (isNaN(valueToSave)) valueToSave = null; 
      }
  }

  var data: any = {};
  data[dbColumnName] = valueToSave;
  
  try {
      await prisma.program.updateMany({
        where: { Programid: key },
        data: data,
      });
      return { success: true };
  } catch (error) {
      console.error(`❌ Update Failed for field '${dbColumnName}':`, error);
      throw error; 
  }
};
// --- שליפת נתונים ---
export const getPrograms = async (): Promise<Program[]> => {
  "use server";
  noStore();
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
  noStore(); 

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