import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.CellPhone) {
      return NextResponse.json({ error: "מספר טלפון הוא שדה חובה" }, { status: 400 });
    }

    const existingGuide = await prisma.guide.findFirst({
      where: { CellPhone: body.CellPhone }
    });

    let guide;

    if (existingGuide) {
      guide = await prisma.guide.update({
        where: { Guideid: existingGuide.Guideid },
        data: {
          FirstName: body.FirstName,
          LastName: body.LastName,
          City: body.City,
          Professions: body.Professions,
          Notes: body.Remarks || body.Notes || "",  // ← שם השדה האמיתי בסכמה
          Status: "פעיל"
        }
      });
    } else {
      const maxGuide = await prisma.guide.findFirst({
        orderBy: { Guideid: 'desc' }
      });
      const nextId = (maxGuide?.Guideid ?? 0) + 1;

      guide = await prisma.guide.create({
        data: {
          Guideid: nextId,
          FirstName: body.FirstName,
          LastName: body.LastName,
          CellPhone: body.CellPhone,
          City: body.City,
          Professions: body.Professions,
          Notes: body.Remarks || body.Notes || "",  // ← שם השדה האמיתי בסכמה
          Status: "פעיל",
          ReligiousSector: "יהודי",
          isAssigned: false
        }
      });
    }

    return NextResponse.json(guide);
  } catch (error: any) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}