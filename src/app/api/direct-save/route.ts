import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { Readable } from "stream";

const prisma = new PrismaClient();

//function to upload file to Google Drive (base64) and return the file link
async function uploadToDrive(base64Data: string, fileName: string, accessToken?: string) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const buffer = Buffer.from(base64Data, "base64");
    const stream = Readable.from(buffer);

    //if there's a specific folder ID in env, upload there, otherwise upload to root
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const parents = folderId ? [folderId] : [];

    const response = await drive.files.create({
      requestBody: { 
        name: fileName,
        mimeType: "application/pdf",
        parents: parents 
      },
      media: { 
        mimeType: "application/pdf", 
        body: stream 
      },
      fields: "id, webViewLink",
    });

    if (response.data.id) {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    }

    console.log("✅ File uploaded to Drive Root/Folder:", response.data.webViewLink);
    return response.data.webViewLink;
  } catch (error: any) {
    console.error("❌ Drive Upload Error:", error.message);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.CellPhone) {
      return NextResponse.json({ error: "מספר טלפון הוא שדה חובה" }, { status: 400 });
    }

    const { cvFileData, cvFileName, accessToken, ...guideData } = body;
    let driveLink = null;

    if (cvFileData) {
    driveLink = await uploadToDrive(cvFileData, cvFileName, accessToken);
  }

    const existingGuide = await prisma.guide.findFirst({
      where: { CellPhone: guideData.CellPhone }
    });

    let guide;

    if (existingGuide) {
      const updateData: any = {
        FirstName: guideData.FirstName,
        LastName: guideData.LastName,
        City: guideData.City,
        Professions: guideData.Professions,
        Notes: guideData.Remarks || guideData.Notes || "",
        Status: "פעיל"
      };

      // if there's a new CV, update the link in the existing guide
      if (driveLink) {
        updateData.CV = driveLink;
      }

      guide = await prisma.guide.update({
        where: { Guideid: existingGuide.Guideid },
        data: updateData
      });
    } else {
      // יצירת מדריך חדש
      const maxResult = await prisma.guide.aggregate({
        _max: { Guideid: true }
      });
      const nextId = (maxResult._max.Guideid ?? 0) + 1;

      guide = await prisma.guide.create({
        data: {
          Guideid: nextId,
          FirstName: guideData.FirstName,
          LastName: guideData.LastName,
          CellPhone: guideData.CellPhone,
          City: guideData.City,
          Professions: guideData.Professions,
          Notes: guideData.Remarks || guideData.Notes || "",
          Area: guideData.Area || "",
          Status: "פעיל",
          ReligiousSector: "יהודי",
          isAssigned: false,
          CV: driveLink || "" 
        }
      });
    }

    return NextResponse.json(guide);
  } catch (error: any) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}