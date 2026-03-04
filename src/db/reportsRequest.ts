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
  try {
    return await prisma.instructorReport.findMany({
      include: {
        payment: true, // זה השורה שחסרה כדי שהסטטוס לא יהיה undefined
      },
      orderBy: { date: "desc" },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
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
export async function deleteInstructorPayment(paymentId: string) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") throw new Error("Unauthorized");

  try {
    // 1. ניתוק כל הדיווחים מהתשלום (איפוס שדה ה-paymentId בדיווחים)
    await prisma.instructorReport.updateMany({
      where: { paymentId: paymentId },
      data: { paymentId: null }
    });

    // 2. מחיקת רשומת התשלום עצמה
    const result = await prisma.instructorPayment.delete({
      where: { id: paymentId }
    });

    return result;
  } catch (error: any) {
    console.error("❌ Delete Payment Error:", error.message);
    throw new Error(`שגיאה בביטול התשלום: ${error.message}`);
  }
}
export async function createInstructorPayment(reportIds: string[], totalAmount: number, instructorInfo: any) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") throw new Error("Unauthorized");

  try {
    // 1. יצירת רשומת התשלום המרכזית
    const payment = await prisma.instructorPayment.create({
      data: {
        totalAmount: totalAmount,
        clerkId: instructorInfo.clerkId,
        firstName: instructorInfo.firstName,
        lastName: instructorInfo.lastName,
        email: instructorInfo.email,
        status: "PAID"
      }
    });

    // 2. עדכון כל הדיווחים שנבחרו עם ה-paymentId החדש
    await prisma.instructorReport.updateMany({
      where: { id: { in: reportIds } },
      data: { paymentId: payment.id }
    });

    return payment;
  } catch (error: any) {
    console.error("❌ Create Payment Error:", error.message);
    throw new Error("שגיאה ביצירת התשלום");
  }
}
export async function markReceiptReceived(paymentId: string, customDate?: string) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") throw new Error("Unauthorized");

  try {
    console.log(`--- Server: Attempting to mark payment ${paymentId} as received ---`);
    
    // אם המשתמש הזין תאריך, נשתמש בו. אם לא, נשתמש בתאריך של הרגע הנוכחי.
    const finalReceiptDate = customDate ? new Date(customDate) : new Date();

    const updated = await prisma.instructorPayment.update({
      where: { id: paymentId },
      data: { 
        status: "RECEIPT_RECEIVED", 
        receiptDate: finalReceiptDate 
      },
    });

    console.log("--- Server: Update successful! New status:", updated.status, "Date:", updated.receiptDate);
    return updated;
  } catch (error: any) {
    console.error("--- Server: Update FAILED ---", error.message);
    throw error;
  }
}