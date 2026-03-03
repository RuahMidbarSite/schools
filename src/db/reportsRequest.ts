"use server";
import prisma from "@/db/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function saveInstructorReport(data: any) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) throw new Error("Unauthorized");

  // המרת תאריך ובדיקה שהנתונים המספריים תקינים
  const reportDate = new Date(data.date);
  const lessons = parseInt(data.lessons) || 0;
  const dailyRate = parseFloat(data.dailyRate) || 0;
  
  // הגנה: אם השנה לא הגיעה מהלקוח, נשתמש בברירת מחדל
  const yearHebrew = data.yearHebrew || "תשפ\"ו";

  return await prisma.instructorReport.create({
    data: {
      clerkId: userId,
      email: user.primaryEmailAddress?.emailAddress || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      schoolName: data.schoolName,
      cityName: data.cityName,
      month: data.month,
      date: reportDate,
      lessons: lessons,
      dailyRate: dailyRate,
      yearHebrew: yearHebrew,
      yearGregorian: reportDate.getFullYear(),
      remarks: data.remarks || "",
    },
  });
}

export async function getReports() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.primaryEmailAddress?.emailAddress;
  const isAdmin = user.publicMetadata?.role === "admin";

  const query = isAdmin ? {} : { email: email };

  return await prisma.instructorReport.findMany({
    where: query,
    orderBy: { date: "desc" },
  });
}
export async function deleteReport(id: string) {
  const user = await currentUser();
  
  // הדפסות לטרמינל ב-VS Code (צד השרת)
  console.log("--- DEBUG DELETE ---");
  console.log("Attempting to delete ID:", id);
  console.log("User Email:", user?.primaryEmailAddress?.emailAddress);
  console.log("User Metadata Role:", user?.publicMetadata?.role);

  if (!user || user.publicMetadata?.role !== "admin") {
    console.error("Access Denied: Not an admin");
    throw new Error("Unauthorized");
  }

  try {
    const result = await prisma.instructorReport.delete({
      where: { id: id }
    });
    console.log("Success! Deleted record:", result.id);
    return result;
  } catch (error: any) {
    console.error("Prisma Error:", error.message);
    throw new Error("Database error");
  }
}
export async function updateInstructorReport(id: string, data: any) {
  const user = await currentUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) throw new Error("Unauthorized");

  return await prisma.instructorReport.update({
    where: { id: id },
    data: {
      schoolName: data.schoolName,
      cityName: data.cityName,
      month: data.month,
      date: new Date(data.date),
      lessons: parseInt(data.lessons),
      dailyRate: parseFloat(data.dailyRate),
      remarks: data.remarks || "",
    },
  });
}
export async function updatePaymentProofUrl(paymentId: string, proofUrl: string) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") throw new Error("Unauthorized");

  try {
    return await prisma.instructorPayment.update({
      where: { id: paymentId },
      data: { 
        proofUrl: proofUrl 
      },
    });
  } catch (error: any) {
    console.error("❌ Prisma Update Error:", error.message);
    throw new Error(`DB Error: ${error.message}`);
  }
}