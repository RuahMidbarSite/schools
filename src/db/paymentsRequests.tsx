"use server";
import { Payments, PendingPayments } from "@prisma/client";
import prisma from "./prisma";

// ===== פונקציות לקבלת ID הבא =====

export const getNextPaymentId = async (): Promise<number> => {
  "use server";
  const maxPayment = await prisma.payments.findFirst({
    orderBy: {
      Id: 'desc'
    },
    select: {
      Id: true
    }
  });
  
  return (maxPayment?.Id || 0) + 1;
};

export const getNextPendingPaymentId = async (): Promise<number> => {
  "use server";
  const maxPendingPayment = await prisma.pendingPayments.findFirst({
    orderBy: {
      Id: 'desc'
    },
    select: {
      Id: true
    }
  });
  
  return (maxPendingPayment?.Id || 0) + 1;
};

// ===== פונקציות עדכון =====

export const updatePaymentColumn = async (
  ColumnName: string,
  newValue: string | number,
  key: number
): Promise<any> => {
  "use server";
  var data = {};
  data[ColumnName] = newValue;
  const query = prisma.payments.update(
    {
      where:
      {
        Id: key
      },
      data: data
    })
  const execute: any = await query;
  return execute;
};

export const updatePendingPaymentColumn = async (
  ColumnName: string,
  newValue: string | number,
  key: number
): Promise<any> => {
  "use server";
  var data = {};
  data[ColumnName] = newValue;
  const query = prisma.pendingPayments.update(
    {
      where:
      {
        Id: key
      },
      data: data
    })
  const execute: any = await query;
  return execute;
};

// ===== פונקציות הוספה - עם תיקון =====

export const addPaymentsRow = async (
  payment: any
): Promise<Payments> => {
  "use server"
  
  // ✅ תמיד קבל ID חדש מהDB - אל תסתמך על מה שהגיע מהפרונט
  const newId = await getNextPaymentId();
  
  // צור אובייקט נקי עם ה-ID החדש
  const cleanPayment = {
    Id: newId,
    Objectid: undefined,
    Programid: payment.Programid || null,
    Issuer: payment.Issuer || "",
    SchoolName: payment.SchoolName || "",
    ProgramName: payment.ProgramName || "",
    Amount: payment.Amount || 0,
    Year: payment.Year || ""
  };
  
  console.log("Creating payment with ID:", newId, cleanPayment);
  
  const promise = await prisma.payments.create({
    data: cleanPayment
  });
  
  return promise;
}

export const addPendingPaymentsRow = async (
  payment: any
): Promise<PendingPayments> => {
  "use server"
  
  // ✅ תמיד קבל ID חדש מהDB
  const newId = await getNextPendingPaymentId();
  
  // צור אובייקט נקי עם ה-ID החדש
  const cleanPayment = {
    Id: newId,
    Objectid: undefined,
    Programid: payment.Programid || null,
    Issuer: payment.Issuer || "",
    Date: payment.Date || null,
    ProgramName: payment.ProgramName || "",
    Amount: payment.Amount || 0,
    CheckDate: payment.CheckDate || null,
    Year: payment.Year || ""
  };
  
  console.log("Creating pending payment with ID:", newId, cleanPayment);
  
  const query = await prisma.pendingPayments.create({
    data: cleanPayment
  });
  
  return query;
}

// ===== פונקציות קריאה =====

export const getPendingPayments = async () => {
  "use server"
  const pendignPayments = await prisma.pendingPayments.findMany({
    orderBy: {
      Id: 'asc',
    },
  });
  return pendignPayments;
}

export const getPayments = async () => {
  "use server"
  const payments = await prisma.payments.findMany({
    orderBy: {
      Id: 'asc',
    },
  });
  return payments;
}

// ===== פונקציות מחיקה =====

export const deletePaymentRow = async (id: number) => {
  "use server"
  const deletedPayment = await prisma.payments.delete({
    where: {
      Id: id,
    },
  });
  return deletedPayment;
}

export const deletePendingPaymentRow = async (id: number) => {
  "use server"
  const deletedPendingPayment = await prisma.pendingPayments.delete({
    where: {
      Id: id,
    },
  });
  return deletedPendingPayment;
}