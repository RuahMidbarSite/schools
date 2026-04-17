import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { Readable } from "stream";

const prisma = new PrismaClient();

// Prevent duplicate folders in Drive by querying existing ones under the specific parent
async function getOrCreateFolder(drive: any, folderName: string, parentId: string): Promise<string> {
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  
  const res = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return folder.data.id;
}

async function uploadToDrive(base64Data: string, fileName: string, accessToken: string | undefined, guideInfo: any) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const buffer = Buffer.from(base64Data, "base64");
    const stream = Readable.from(buffer);

    const area = guideInfo.Area || "";
    const city = guideInfo.City || "";
    const fullName = `${guideInfo.FirstName || ""} ${guideInfo.LastName || ""}`.trim() || "שם לא ידוע";
    
    // Mirroring the frontend folder hierarchy to keep Drive organized
    const foldersToNavigate = ["מסמכי מדריכים", area, city, fullName, "קורות חיים"];
    
    let currentParentId = "root"; 

    for (const folderName of foldersToNavigate) {
      if (!folderName) continue; // Skip empty names to avoid broken paths
      currentParentId = await getOrCreateFolder(drive, folderName, currentParentId);
    }

    const response = await drive.files.create({
      requestBody: { 
        name: fileName,
        mimeType: "application/pdf",
        parents: [currentParentId] 
      },
      media: { 
        mimeType: "application/pdf", 
        body: stream 
      },
      fields: "id, webViewLink",
    });

    if (response.data.id) {
      // Ensure the generated link is accessible without auth
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' }, 
      });
    }

    console.log("✅ File uploaded to precise Drive folder:", response.data.webViewLink);
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

    const { cvFileData, cvFileName, accessToken, Guideid, ...guideData } = body;
    let driveLink = null;

    if (cvFileData) {
      driveLink = await uploadToDrive(cvFileData, cvFileName, accessToken, guideData);
    }

    let existingGuide = null;
    
    // Explicit check via Guideid to handle frontend updates safely
    if (Guideid) {
      existingGuide = await prisma.guide.findUnique({
        where: { Guideid: Number(Guideid) }
      });
    }

    // Fallback for AI extractions where ID isn't known yet
    if (!existingGuide) {
      existingGuide = await prisma.guide.findFirst({
        where: { CellPhone: guideData.CellPhone }
      });
    }

    let guide;

    if (existingGuide) {
      const updateData: any = {
        FirstName: guideData.FirstName,
        LastName: guideData.LastName,
        CellPhone: guideData.CellPhone, 
        City: guideData.City,
        Area: guideData.Area, 
        Professions: guideData.Professions,
        Notes: guideData.Remarks || guideData.Notes || "",
        Status: "פעיל"
      };

      if (driveLink) {
        updateData.CV = driveLink;
      }

      guide = await prisma.guide.update({
        where: { Guideid: existingGuide.Guideid },
        data: updateData
      });
    } else {
      // Manual ID increment logic since auto-increment isn't used
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