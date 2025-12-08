"use server";
import { Payments } from "@prisma/client";
import prisma from "./prisma";


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
};

export const addPaymentsRow = async (
  payment: any
): Promise<Payments> => {
  "use server"
  let promise = prisma.payments.create({
    data: payment
  });
  return promise
}

export const addPendingPaymentsRow = async (
  payment: any
): Promise<any> => {
  "use server"
  const query = await prisma.pendingPayments.create({
    data: payment
  });
  return
}

export const getPendingPayments = async () => {
  "use server"
  const pendignPayments = await prisma.pendingPayments.findMany({
    orderBy: {
      Id: 'asc',
    },
  });
  return pendignPayments
}

export const deletePaymentRow = async (id: number) => {
  "use server"
  const deletedPayment = await prisma.payments.delete({
    where: {
      Id: id,
    },
  });
  return deletedPayment
}

export const deletePendingPaymentRow = async (id: number) => {
  "use server"
  const deletedPendingPayment = await prisma.pendingPayments.delete({
    where: {
      Id: id,
    },
  });
  return deletedPendingPayment
}