"use server";
import { unstable_noStore as noStore } from "next/cache";
import dynamic from 'next/dynamic';
import prisma from "@/db/prisma";
import { Cities, ReligionSector, Role, StatusSchools, StatusContacts, StatusPrograms, EducationStage, Assigned_Guide, Guide, Profession, MessagePattern, School, PrismaClient, Prisma, Areas, Years, SchoolTypes, StatusGuides } from "@prisma/client";
export type TableType = "SchoolsContact" | "Recommender" | "Guide" | "Profession" | "School" | "Assigned_Guide" |
  "Guides_ToAssign" | "Program" | "ReligionSector" | "Cities" | "Areas" | "Colors" | "Payments" | "ProgramPricing" | "PendingPayments"
const TableTranslation: { [index: string]: any } =
{
  Program: [
    "מזהה",
    "שנה",
    "הצעה",
    "סטטוס",
    "מוצר",
    "הזמנה",
    "שלב",
    "סמל",
    "בית ספר",
    "יישוב",
    "איש קשר",
    "תאריך",
    "אזור",
    "תכנית",
    "ימים",
    "יום נבחר",
    "שבועות",
    "שכבה",
    "שיעורים ביום",
    "שיעורים בתשלום",
    "מחיר לשיעור",
    "שיעורים בחינם",
    "תשלומים נוספים",
    "פרטים"
  ],

  School: [
    "מזהה",
    "שם בית ספר",
    "שלב חינוך",
    "מגזר",
    "סוג",
    "עיר",
    "סמל",
    "נציג",
    "סטטוס",
    "תאריך",


  ],
  Guide: [
    "מספר מדריך",
    "פרטי",
    "משפחה",
    "טלפון",
    "וואסטאפ", // whatsapp is not used, this for ordering properly when returning from fields.
    "משובץ", // If the guide is assigned to some program already.
    "קוח",
    "יישוב",
    "אזור",
    "מגזר",
    "מחיר שעתי",
    "סטטוס",
    "הערות",
    "מסמכים",
    "אישור משטרה",
    "הסכם",
    "ביטוח",
    "תעודות",
    "מקצועות"

  ],

  SchoolsContact:
    [
      "מזהה איש קשר",
      "מזהה בית ספר",
      "שם פרטי",
      "שם משפחה",
      "תפקיד",
      "טלפון נייד",
      "טלפון רגיל",
      "מייל",
      "קישור גוגל קונטאנט",
      "סטטוס",
      "האם נציג",
    ],

  Profession:
    [
      "מזהה",
      "מספר מדריך",
      "גוגל",
      "סטטוס",
      "תיאטרון",
      "שחמט",
      "לחימה",
      "סטיילינג",
      "קיימות",
      "ניו מדיה",
      "הייטק",
      "יוגה",
      "כתיבה",
      "פיננסי",
      "ספורט",
      "קוסמות",
      "כלב",
      "רפואה",
      "מדע",
      "מחול",
      "תקשורת",
      "למידה",
      "פסיכומטרי",
      "חשיבה",
      "להטוטנות",
      "חינוך מיני",
      "טיפול",
      "מוסיקה",
      "ליווי",
      "קולנוע",
      "נגרות",
      "יזמות",
      "אנגלית",
      "מתמטיקה",
      "קאוצינג",
      "טלמרקטינג",
      "ייעוץ הוליסטי",
      "יהדות",
      "טיסה",
      "מותאמת",
      "מנהיגות"

    ],

  Assigned_Guide: [
    "מספר סידורי",
    "מספר תכנית",
    "שנת תוכנית",
    "הצעה",
    "סטטוס",
    "הזמנה",
    "ימים",
    "פרטים",
    "מחיר לשעה",
    "מספר מדריך"
  ],
  Guides_ToAssign:
    ["מספר מדריך", "מדריך"],
  Payments: [
    "מספר תשלום",
    "מספר תוכנית",
    "מנפיק",
    "בית ספר",
    "תוכנית",
    "סכום"
  ],
  ProgramPricing: [
    "שנה",
    "מס' שיעורים בתשלום",
    "עלות שיעור",
    "מס' שיעורים בחינם",
    "מס' שיעורים כולל",
    "תשלומים נוספים",
    "תמחור כולל",
    "תוכנית"
  ],
  PendingPayments: [
    "מספר תשלום",
    "מספר תוכנית",
    "מנפיק",
    "תאריך",
    "תוכנית",
    "סכום",
    "תאריך תשלום"
  ],



}


var Mapping = new Map();

export const getModelFields = async (name: TableType): Promise<any> => {
  "use server";
  // Mapping models to their fields, filtering out object types
  Prisma.dmmf.datamodel.models.map((model) => {
    Mapping[model.name] = model.fields
      .filter((field) => field.kind !== 'object')
      .map((field) => field.name);
  });
  // filtering objectID
  Mapping[name] = Mapping[name].filter((_, index) => index > 0);


  // Return a Promise that resolves with the required values
  return new Promise((resolve, reject) => {
    if (Mapping[name] && TableTranslation[name]) {
      resolve([Mapping[name], TableTranslation[name]]);
    } else {
      reject(new Error(`Invalid name provided: ${name}`));
    }
  });
};

export const getAllCities = async (): Promise<Cities[]> => {
  "use server"
  const cities = prisma.cities.findMany({
    orderBy: {
      CityName: 'asc', // Sort by cityName in ascending order
    },
  });

  return cities
}

export const createCities = async (entries: Partial<Cities>[]) => {
  let created_entries = prisma.cities.createMany({ data: entries as Cities[] })
  return created_entries

}
/** Returns the new city list after deleting the cities. */
export const deleteCities = async (AllCities: Cities[], Cities_to_delete: Partial<Cities[]>): Promise<Cities[]> => {
  let deleted_ids: number[] = Cities_to_delete.map((val) => val.Cityid)
  let cities_remaining: Cities[] = AllCities.filter((val) => deleted_ids.includes(val.Cityid))


  let promise = prisma.cities.deleteMany({ where: { Cityid: { in: deleted_ids } } })

  // this replaces the Cityid
  const updatedCities = cities_remaining.map((city, index) => ({
    ...city,
    Cityid: index + 1, // Update Cityid to be sequential (1, 2, 3, ...)
  }));

  let promise_Array = updatedCities.map((city) =>
    prisma.cities.update({
      where: { Cityid: city.Cityid }, // Assuming there's an `id` field
      data: { Cityid: city.Cityid },
    })
  )

  return promise.then((_) => {
    return Promise.all([...promise_Array]).then((response) => {
      console.log(response)
      return cities_remaining.sort((arg1, arg2) => arg1.Cityid - arg2.Cityid)
    })

  })



}


export const getAllDistricts = async (): Promise<Areas[]> => {
  const areas: Promise<Areas[]> = prisma.areas.findMany({
    orderBy: {
      Areaid: 'asc', // Sort by statusName in ascending order
    },
  })
  return areas

}


export const getAllReligionSectors = async (): Promise<ReligionSector[]> => {
  "use server"
  const sectors = prisma.religionSector.findMany({
    orderBy: {
      ReligionName: 'asc', // Sort by religionName in ascending order
    },
  });
  return sectors
}



export const getRoles = async (): Promise<any> => {
  "use server"
  const roles = prisma.role.findMany({
    orderBy: {
      RoleName: 'asc', // Sort by roleName in ascending order
    },
  });
  return roles
}



export const getAllStatuses = async (name: "Schools" | "Programs" | "Contacts"|"Guides"): Promise<StatusContacts[] | StatusPrograms[] | StatusSchools[] | StatusGuides[]> => {
  "use server"
  const map: Map<"Schools" | "Programs" | "Contacts"|"Guides", string> = new Map()
  map.set('Schools', 'statusSchools')
  map.set('Programs', 'statusPrograms')
  map.set('Contacts', 'statusContacts')
   map.set('Guides', 'statusGuides')
  const statuses = prisma[map.get(name)].findMany({
    orderBy: {
      StatusId: 'asc', // Sort by statusName in ascending order
    },
  });
  return statuses
}


export const getEducationStages = async (): Promise<EducationStage[]> => {
  const stages = prisma.educationStage.findMany({
    orderBy: {
      StageName: 'asc', // Sort by stageName in ascending order
    },
  });
  return stages
}

export const getMessagePatterns = async (): Promise<MessagePattern[]> => {
  "use server"
  const patterns = prisma.messagePattern.findMany({
    orderBy: {
      PatternId: 'asc', // Sort by patternId in ascending order
    },
  });
  return patterns
}
export const getPatternsByContext = async (context: string) => {
  "use server";
  try {
    return await prisma.messagePattern.findMany({
      where: {
        MessageContext: context,
      },
      orderBy: {
        PatternId: "asc",
      },
    });
  } catch (error) {
    console.error(`Error fetching patterns for context ${context}:`, error);
    return [];
  }
};
export const addContactStatuses = async (status: string) => {
  "use server";
  try {
    const existing = await prisma.statusContacts.findFirst({
      where: { StatusName: status }
    });
    
    if (existing) return existing;

    const allStatuses = await prisma.statusContacts.findMany();
    const maxId = allStatuses.length > 0 ? Math.max(...allStatuses.map((s: any) => s.StatusId)) : 0;

    const newStatus = await prisma.statusContacts.create({
      data: {
        StatusId: maxId + 1,
        StatusName: status, 
      },
    });
    return newStatus;
  } catch (error) {
    console.error('Error adding contact status:', error);
    return null;
  }
}

export const deletePattern = async (Id) => {
  // Delete the pattern
  const deletedPattern = prisma.messagePattern.delete({
    where: {
      PatternId: Id,
    },
  });

  return deletedPattern;
};
export const addPattern = async (id, title, msg1, msg2, fileName, messageContext = "Marketing") => {
  const newPattern = prisma.messagePattern.create({
    data: {
      PatternId: id,
      Caption: title,
      ...(msg1 && msg1 !== "" && { Message1: msg1 }),
      ...(msg2 && msg2 !== "" && { Message2: msg2 }),
      ...(fileName && fileName !== "" && { File: fileName }),
      MessageContext: messageContext, // הוספת השדה החדש
    },
  });

  return newPattern;
}



export const updateContactsStatus = async (status: string, contactsIds: number[]) => {

  try {
    // Update the status for the specified contact IDs
    await prisma.schoolsContact.updateMany({
      where: {
        Contactid: {
          in: contactsIds,
        },
      },
      data: {
        Status: status,
      },
    });

    console.log(`Successfully updated status for contacts: ${contactsIds.join(', ')}`);
  } catch (error) {
    console.error('Error updating contact statuses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllAssignedInstructors = async () => {
  noStore(); // <--- חובה! מכריח את השרת להביא נתונים טריים מה-DB
  
  const guides = await prisma.assigned_Guide.findMany({
    orderBy: {
      Programid: 'asc',
    },
  });

  return guides;
}

export const getAllGuides = async () => {

  const guides = prisma.guide.findMany({
    orderBy: {
      Guideid: 'asc',
    },
  });
  return guides;
}


export const getAllProfessions = async () => {
  const guides = prisma.profession.findMany({
    orderBy: {
      Guideid: 'asc', // Assuming guideId corresponds to Guideid
    },
  });
  return guides

}

export const getPayments = async () => {
  const payments = prisma.payments.findMany({
    orderBy: {
      Id: 'asc',
    },
  });
  return payments
}

export const getPricingData = async () => {
  const pricing = prisma.programPricing.findMany({
    orderBy: {
      Pricingid: 'asc',
    },
  });
  return pricing
}

export const getProfessionAtIndex = async (index: number) => {
  const guides = prisma.profession.findMany({
    orderBy: {
      Guideid: 'asc', // Assuming guideId corresponds to Guideid,
    },
    where: {
      Guideid: index
    }
  });
  return guides[0]

}

export const getSchoolTypes = async (): Promise<SchoolTypes[]> => {
  const types = prisma.schoolTypes.findMany({
    orderBy: {
      TypeName: 'asc', // Sort by statusName in ascending order
    },
  });
  return types
}

export const getAllSchoolsTypes = async (): Promise<SchoolTypes[]> => {
  const types = prisma.schoolTypes.findMany({
    orderBy: {
      TypeName: 'asc',
    },
  })
  return types

}

export const getYears = async (): Promise<any> => {
  "use server"
  const years = prisma.years.findMany({
    orderBy: {
      YearName: 'asc',
    },
  });
  return years
}

export const getProductTypes = async (): Promise<any> => {
  const products = prisma.productTypes.findMany({
    orderBy: {
      ProductName: 'asc',
    },
  });
  return products
}

export const getOrders = async (): Promise<any> => {
  const orders = prisma.orders.findMany({
    orderBy: {
      OrderName: 'asc',
    },
  });
  return orders
}

export const insertNamesIntoCollection = async (
  collectionName: string,
  idField: string,
  nameField: string,
  names: string[],
  additionalFields?: Record<string, any> // ← קבלת FieldName
): Promise<any> => {
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error('Invalid names array');
  }

  return prisma[collectionName].findMany().then((collection) => {
    const getMax = collection.length > 0 ? Math.max(...collection.map((val: any) => val[idField])) : 0;
    
    const dataToInsert = names.map((name, index) => ({
      [idField]: index + getMax + 1,
      [nameField]: name,
      ...additionalFields // ← הזרקת FieldName למונגו
    }));

    return prisma[collectionName].createMany({
      data: dataToInsert,
    }).then(() => {
      // מחזירים את כל הטבלה כדי שהאפליקציה תתמלא בבת אחת
      return prisma[collectionName].findMany({
        orderBy: { [nameField]: 'asc' }
      });
    });
  });
};

export const deleteNamesFromCollection = async (
  collectionName: string,
  nameField: string,
  all_names: string[],
  deleted_names: string[],
  idFieldName: string

):Promise<any> => {
  try {
    const result = await prisma[collectionName].findMany({
      where: {
        [nameField]: {
          in: all_names,
        },
      },
    });

    // all data that remaings
    let remaining_data: any[] = result.filter((res) => !deleted_names.includes(res[nameField]))

    await prisma[collectionName].deleteMany({
      where: {
        [nameField]: {
          in: deleted_names,
        },
      },
    });
    let updated_data = []
    for (let [index, data_x] of remaining_data.entries()) {

      updated_data.push(data_x)
    }


    return updated_data

  } catch (error) {
    console.error('Error deleting names from collection:', error);
    throw new Error('Failed to delete names');
  }
}


export const getAllYears = async (): Promise<Years[]> => {

  return prisma.years.findMany()


}


// --- הוסף את זה לסוף הקובץ src/db/generalrequests.tsx ---

export const updateSchoolStatus = async (status: string, schoolIds: any[]) => {
  "use server";
  try {
    // המרה למספרים כי בבסיס הנתונים Schoolid הוא Int
    const validIds = schoolIds
      .map(id => Number(id))
      .filter(id => !isNaN(id) && id > 0);

    if (validIds.length === 0) {
      console.log("No valid school IDs to update");
      return;
    }

    console.log(`Updating schools ${validIds} to status: ${status}`);

    await prisma.school.updateMany({
      where: {
        Schoolid: {
          in: validIds,
        },
      },
      data: {
        Status: status,
      },
    });

    console.log(`Successfully updated status for schools: ${validIds.join(', ')}`);
  } catch (error) {
    console.error('Error updating school statuses:', error);
    throw error;
  }
};

export const addSchoolStatuses = async (status: string) => {
  "use server";
  try {
    const existing = await prisma.statusSchools.findFirst({
      where: { StatusName: status }
    });
    
    if (existing) return existing;

    const allStatuses = await prisma.statusSchools.findMany();
    const maxId = allStatuses.length > 0 ? Math.max(...allStatuses.map((s: any) => s.StatusId)) : 0;

    const newStatus = await prisma.statusSchools.create({
      data: {
        StatusId: maxId + 1,
        StatusName: status,
      },
    });
    return newStatus;
  } catch (error) {
    console.error('Error adding school status:', error);
    return null; 
  }
}
// הוסף את הפונקציה הזו ב-generalrequests.tsx (בסוף הקובץ או ליד getAllProfessions)

export const getAllProfessionTypes = async () => {
  try {
    const professionTypes = await prisma.professionTypes.findMany({
      orderBy: {
        ProfessionName: 'asc',
      },
    });
    return professionTypes;
  } catch (error) {
    console.error('Error fetching profession types:', error);
    return [];
  }
}

// זה יחזיר מערך של:
// [
//   { ProfessionId, ProfessionName, FieldName },
//   { ProfessionId, ProfessionName, FieldName },
//   ...
// ]