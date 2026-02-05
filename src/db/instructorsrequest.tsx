"use server";
import prisma from "@/db/prisma";
import {
  School,
  ReligionSector,
  Cities,
  Prisma,
  SchoolsContact,
  Guide,
  Guides_ToAssign,
  Assigned_Guide,
  ColorCandidate,
  Colors,
  Distances,
  Profession,
} from "@prisma/client"; // look at this type to know the fields in the table.
import { ConsoleLogEntry } from "selenium-webdriver/bidi/logEntries";
import internal from "stream";

export const getInstructors = async (): Promise<any> => {
  "use server";

  const Guides: Promise<Guide[]> = prisma.guide.findMany({
    orderBy: {
      Guideid: "asc", // Assuming "Guideid" maps to "guideId"
    },
    take: 2000,
  });
  const cities: Promise<{ CityName: string }[]> = prisma.cities.findMany({
    orderBy: {
      CityName: "asc", // Assuming "CityName" maps to "cityName"
    },
    select: {
      CityName: true,
    },
  });
  // to prevent data fetch waterfall ( not needed really here, but it does not require extra effort)
  const sectors: Promise<{ ReligionName: string }[]> = prisma.religionSector.findMany({
    select: {
      ReligionName: true,
    },
  });
  const data: [Guide[], { CityName: string }[], { ReligionName: string }[]] = await Promise.all([
    Guides,
    cities,
    sectors,
  ]);

  const citiesarr = data[1].map((val) => val.CityName);
  const religions = data[2].map((val) => val.ReligionName);
  return [data[0], citiesarr, religions];
};

const getAllGuides = async (): Promise<Guide[]> => {
  const Guides: Promise<Guide[]> = prisma.guide.findMany({
    orderBy: {
      Guideid: "asc", // Assuming "Guideid" maps to "guideId"
    },
    take: 2000,
  });
  return Guides

}

//TODO: continue here.
export const updateInstructorsColumn = async (
  ColumnName: string,
  newValue: any,
  key: number
): Promise<any> => {
  "use server";
  var row = [];
  row[ColumnName] = newValue;
  // have to use raw string for variable column
  const updatedGuide = await prisma.guide.update({
    where: { Guideid: key },
    data: {
      [ColumnName]: newValue,
    },
  });
  const execute = await updatedGuide;

};

export const addInstructorsRows = async (data: Guide[]): Promise<Profession[]> => {
  "use server";
  var queries = [];
  var queries_2 = []
  for (let i = 0; i < data.length; i++) {
    const guide: Guide = data[i];
    // Example usage:

    const newGuide = prisma.guide.create({
      data: guide,
    });
    // also creates his profession page.
    const data_profession: any = {
      Guideid: guide.Guideid,

    }
    const new_profession = prisma.profession.create({ data: data_profession })

    queries.push(newGuide);

    queries_2.push(new_profession)
  }
  return Promise.all([...queries, ...queries_2]).then((val) => {
    return prisma.profession.findMany()

  });
};
export const deleteInstructorsRows = async (
  deleted_ids: number[],
  Indexes_Not_Touched: number[]
): Promise<null> => {
  let query: any[] = [];
  await prisma.profession.deleteMany({ where: { Guideid: { in: deleted_ids } } })


  await prisma.guide.deleteMany({ where: { Guideid: { in: deleted_ids } } })


   return null


};



export const deleteGuidesCascading = async (deleted_ids: number[],
  Indexes_Not_Touched: number[]): Promise<null> => {



  return prisma.$transaction(
    async (prisma) => {
       await deleteAssignedByGuideID(deleted_ids)
       await deleteAssignCandidatesByGuideID(deleted_ids)
       await removeColorCandidatesByGuideID(deleted_ids)
     await deleteInstructorsRows(deleted_ids, Indexes_Not_Touched)
       return null
    },
    {
      timeout: 20000,
      maxWait: 20000,
    }
  );

}

export const deleteAssignedByGuideID = async (deleted_ids: number[]): Promise<Assigned_Guide[]> => {
  await prisma.assigned_Guide.deleteMany({ where: { Guideid: { in: deleted_ids } } })
  return null

}
export const deleteAssignCandidatesByGuideID = async (deleted_ids: number[]): Promise<Guides_ToAssign[]> => {
  await prisma.guides_ToAssign.deleteMany({ where: { Guideid: { in: deleted_ids } } })
  return null
} 
export const removeColorCandidatesByGuideID = async (deleted_ids: number[]): Promise<null> => {
 await prisma.colorCandidate.deleteMany({ where: { Guideid: { in: deleted_ids } } })
   return null

}
// each update in multiselect can only be delete/update
// we "delete" by just changing the value to false in the database.
export const updateProfessions = async (
  ColumnNames: string[],
  updateFlag: boolean,
  key: number
) => {
  "use server";

  var queue: any = [];
  var row;

  for (let index = 0; index < ColumnNames.length; index++) {
    // have to use raw string for variable column
    const query = prisma.profession.update({
      where: {
        Guideid: key,
      },
      data: {
        [ColumnNames[index]]: updateFlag, // Dynamic property assignment with square brackets
      },
    });
    queue.push(query);
  }

  return await Promise.all(queue);
};

export const getInfo = async () => {
  return {
    clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    developerKey: process.env.NEXT_PUBLIC_DEVELOPER_KEY,
  };
};
export const getEnv = async () => {
  return process.env.NODE_ENV

}
export const getAssignedInstructorsByProgramID = async (programID: number): Promise<Assigned_Guide[]> => {

  const guides: Promise<Assigned_Guide[]> = prisma.assigned_Guide.findMany({
    where: { Programid: programID }

  })

  return guides
}

export const deleteAssignedInstructor = async (programID: number, GuideID: number) => {
  // we are deleting a unique element but for now i can't find how show this in mongodb
  //(setting two fields to be a unique in scheme)
  return prisma.assigned_Guide.deleteMany({ where: { Programid: programID, Guideid: GuideID } })

}
export const deleteAssignedInstructorsManyAccordingToProgramToProgramIds = async (Programids: number[]): Promise<null> => {
  if (Programids.length === 0) { return null }
  // no need to reorganize since we don't have ids.
  await prisma.assigned_Guide.deleteMany({ where: { Programid: { in: Programids } } })
  return null
}

export const addAssignedInstructors = async (programID: number, GuideID: number, Guide: Partial<Assigned_Guide>) => {
  return prisma.assigned_Guide.create({ data: Guide as Assigned_Guide })

}

export const getGuidesById = async (ids: number[]): Promise<Guide[]> => {

  const guide: Promise<Guide[]> = prisma.guide.findMany({ where: { Guideid: { in: ids } } })

  return guide

}

export const getAllCandidates = async (): Promise<Guides_ToAssign[]> => {
  const Can: Promise<Guides_ToAssign[]> = prisma.guides_ToAssign.findMany()

  return Can


}

export const getAllDistances = async (): Promise<Distances[]> => {
  const distances: Promise<Distances[]> = prisma.distances.findMany()
  return distances
}
export const createDistances = async (entries: Partial<Distances>[]) => {
  let created_entries = prisma.distances.createMany({ data: entries })
  return created_entries

}
export const deleteDistances = async (Distances_to_delete: Distances[]) => {
  let deleted_ids_1 = Distances_to_delete.map((val) => val.DestinationId)
  let deleted_ids_2 = Distances_to_delete.map((val) => val.OriginId)

  let promise = prisma.distances.deleteMany({
    where: {
      OR: [
        { DestinationId: { in: deleted_ids_1 } },
        { OriginId: { in: deleted_ids_2 } }
      ]


    }
  })
  return promise

}


export const getAllColors = async (): Promise<Colors[]> => {
  const Res: Promise<Colors[]> = prisma.colors.findMany()

  return Res
}

export const getAllCandidatesByProgramID = async (programID: number) => {
  const Can: Promise<Guides_ToAssign[]> = prisma.guides_ToAssign.findMany({ where: { Programid: programID } })

  return Can


}
export const setAssignCandidate = async (Guideid: number, Programid: number): Promise<Guides_ToAssign> => {
  // We do this because it might be possible for a guide to be Candidate for multiple programs.
  // Also, we don't check if the entry already exists because this situation should never happen

  return prisma.guides_ToAssign.create({ data: { Guideid: Guideid, Programid: Programid } })

}
export const removedAssignCandidate = async (Guideid: number, Programid: number): Promise<Guides_ToAssign> => {
  return prisma.guides_ToAssign.delete({ where: { Programid_Guideid: { Guideid: Guideid, Programid: Programid } } })

}
export const removeAssignCandidatesManyAccordingToProgramIds = async (Programids: number[],): Promise<{count:number}> => {
  if (Programids.length === 0) { return null }
  return prisma.guides_ToAssign.deleteMany({ where: { Programid: { in: Programids } } })


}

export const setColorCandidate = async (Guideid: number, Programid: number, ColorHexCode: string): Promise<ColorCandidate> => {
  // check if exists
  return prisma.colorCandidate.findUnique({ where: { Programid_Guideid: { Guideid: Guideid, Programid: Programid } } }).then(async (res) => {
    const query_object: any = { where: { Programid_Guideid: { Guideid: Guideid, Programid: Programid } }, data: { ColorHexCode: ColorHexCode } }
    if (res === null) {
      const new_color_candidate: Partial<ColorCandidate> = { Guideid: Guideid, Programid: Programid, ColorHexCode: ColorHexCode }
      const create_query = await prisma.colorCandidate.create({ data: new_color_candidate })
      return prisma.colorCandidate.update(query_object)
    }
    return prisma.colorCandidate.update(query_object)

  })

}

export const getAllColorCandidates = async (): Promise<ColorCandidate[]> => {
  return prisma.colorCandidate.findMany()

}
export const removeAllColorsCandidatesByProgramids = async (Programids: number[]): Promise<{count:number}> => {
  // no need to reorganize since we don't have ids.
  if (Programids.length === 0) { return null }
  return prisma.colorCandidate.deleteMany({ where: { Programid: { in: Programids } } })

}

export const getColorCandidate = async (Guideid: number, Programid: number): Promise<{ Guideid: number, Programid: number, ColorHexCode: string }> => {

  return prisma.colorCandidate.findFirst({ where: { Guideid: Guideid, Programid: Programid } }).then((res) => {

    if (res === null) {
      prisma.colorCandidate.create({ data: { Guideid: Guideid, Programid: Programid } }).then((val) => { return { Guideid: Guideid, Programid: Programid, ColorHexCode: "#FFFFFF" } });
    }
    return { Guideid: res.Guideid, Programid: res.Programid, ColorHexCode: res.ColorHexCode };

  })



}

/**
 * עדכון נוסח הודעה עבור תוכנית ספציפית בבסיס הנתונים
 */
/**
 * עדכון נוסח הודעה עבור תוכנית ספציפית בבסיס הנתונים
 */
/**
 * עדכון נוסח הודעה עבור תוכנית ספציפית בבסיס הנתונים
 * שימוש ב-updateMany מאפשר עדכון גם כשהשדה אינו מוגדר כייחודי בפריזמה
 */
export const updateProgramMsg = async (Programid: number, msg: string) => {
  "use server";
  
  console.log("=".repeat(50))
  console.log("📝 updateProgramMsg נקראה")
  console.log("📊 פרמטרים:", { Programid, msg })
  console.log("=".repeat(50))
  
  try {
    // בדיקה 1: האם התוכנית קיימת?
    const existingProgram = await prisma.program.findFirst({
      where: { Programid: Programid }
    })
    
    if (!existingProgram) {
      console.error("❌ תוכנית לא נמצאה:", Programid)
      return { success: false, error: "Program not found" }
    }
    
    console.log("✅ תוכנית נמצאה:", existingProgram.Programid, existingProgram.ProgramName)
    console.log("📝 נוסח ישן:", existingProgram.msg)
    console.log("📝 נוסח חדש:", msg)
    
    // בדיקה 2: עדכון
    const result = await prisma.program.updateMany({
      where: { 
        Programid: Programid 
      },
      data: {
        msg: msg
      }
    })
    
    console.log("📊 תוצאת updateMany:", result)
    console.log(`✅ עודכנו ${result.count} רשומות`)
    
    // בדיקה 3: אימות שהעדכון עבד
    const updatedProgram = await prisma.program.findFirst({
      where: { Programid: Programid }
    })
    
    console.log("🔍 אימות - נוסח לאחר עדכון:", updatedProgram?.msg)
    
    if (updatedProgram?.msg === msg) {
      console.log("✅✅✅ העדכון הצליח! הנוסח נשמר במסד הנתונים")
      return { success: true, count: result.count, verified: true }
    } else {
      console.error("❌ העדכון נכשל - הנוסח לא השתנה")
      return { success: false, count: result.count, verified: false }
    }
    
  } catch (error) {
    console.error("❌❌❌ שגיאה חמורה ב-updateProgramMsg:")
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Full error:", error)
    return { success: false, error: error.message }
  }
};
