"use server"

// ודא שהנתיב ל-prisma נכון לפי מבנה הפרויקט שלך
import prisma from "@/lib/prisma" 
import { InstructorPaymentStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

// הפונקציה לרענון הנתונים במסך (יש לשנות את הנתיב לנתיב האמיתי של העמוד שלך)
const PAGE_PATH = "/guidesPayments"

// 1. הבאת דיווחים שממתינים לתשלום (עבור הלשונית הראשונה: "דיווחי מדריכים")
export async function getUnpaidReports() {
  try {
    const reports = await prisma.instructorReport.findMany({
      where: {
        paymentId: null, // מביא רק דיווחים שעדיין לא מקושרים לתשלום
      },
      orderBy: { date: 'desc' }
    });
    return { success: true, data: reports };
  } catch (error) {
    console.error("Error fetching unpaid reports:", error);
    return { success: false, error: "שגיאה בהבאת הדיווחים" };
  }
}

// 2. יצירת תשלום חדש מתוך מספר דיווחים נבחרים (פעולת "סמן כשולם")
export async function createInstructorPayment(data: {
  reportIds: string[];
  totalAmount: number;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  proofUrl?: string;
}) {
  try {
    // Prisma יודעת ליצור את התשלום ולעדכן את הדיווחים בפעולה אחת בעזרת 'connect'
    const newPayment = await prisma.instructorPayment.create({
      data: {
        totalAmount: data.totalAmount,
        clerkId: data.clerkId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        proofUrl: data.proofUrl,
        status: "PAID",
        reports: {
          connect: data.reportIds.map(id => ({ id })) 
        }
      }
    });

    revalidatePath(PAGE_PATH);
    return { success: true, data: newPayment };
  } catch (error) {
    console.error("Error creating payment:", error);
    return { success: false, error: "שגיאה ביצירת התשלום" };
  }
}

// 3. הבאת תשלומים לפי סטטוס (עבור הלשוניות "שולם למדריכים" ו-"קבלות והנה"ח")
export async function getPaymentsByStatus(statuses: InstructorPaymentStatus[]) {
  try {
    const payments = await prisma.instructorPayment.findMany({
      where: {
        status: { in: statuses }
      },
      include: {
        reports: true // מביא גם את הדיווחים המקושרים כדי שנוכל להציג על איזה חודשים שילמנו
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: payments };
  } catch (error) {
    console.error("Error fetching payments:", error);
    return { success: false, error: "שגיאה בהבאת התשלומים" };
  }
}

// 4. עדכון סטטוס של תשלום קיים (למשל הזנת קבלה או העברה להנה"ח)
export async function updatePaymentStatus(
  paymentId: string, 
  newStatus: InstructorPaymentStatus, 
  receiptDate?: Date
) {
  try {
    const updatedPayment = await prisma.instructorPayment.update({
      where: { id: paymentId },
      data: { 
        status: newStatus,
        ...(receiptDate && { receiptDate }) // מתעדכן רק אם הועבר תאריך
      }
    });

    revalidatePath(PAGE_PATH);
    return { success: true, data: updatedPayment };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return { success: false, error: "שגיאה בעדכון סטטוס התשלום" };
  }
}