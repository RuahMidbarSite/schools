"use server";
import prisma from "@/db/prisma";
import {
  School,
  ReligionSector,
  Cities,
  Prisma,
  SchoolsContact,
  Program,
} from "@prisma/client"; // look at this type to know the fields in the table.
import { deleteContactsBySchoolID } from "./contactsRequests";
import { deleteProgramsBySchoolIDCascading } from "./programsRequests";


export const getSchoolIdAndNameMap = async (): Promise<[number[], string[]]> => {
  "use server";
  const schoolsQ: Promise<any> = prisma.school.findMany({
    select: {
      Schoolid: true,
      SchoolName: true
    },
    orderBy: {
      Schoolid: 'asc'
    }
  });
  const schoolIds: number[] = [];
  const formattedSchoolList: string[] = [];
  return schoolsQ.then((schools) => {
    schools.forEach(school => {
      schoolIds.push(school.Schoolid);
      const formattedString = `${school.Schoolid}-${school.SchoolName}`;
      formattedSchoolList.push(formattedString);
    });
    return [schoolIds, formattedSchoolList];
  })



}

// returns the schools and the cities and sectors for the select portion.
export const getSchools = async (): Promise<any> => {
  "use server";
  const schools: Promise<School[]> = prisma.school.findMany({
    orderBy: { Schoolid: "asc" },
  });
  const sectors: Promise<ReligionSector[]> = prisma.religionSector.findMany();
  const cities: Promise<Cities[]> = prisma.cities.findMany({
    orderBy: { CityName: "asc" },
  });
  // const schools: Promise<
  //   School[]
  // > = prisma.$queryRaw`Select * From "School" ORDER BY "Schoolid" LIMIT 2000 `;
  // const sectors: Promise<
  //   ReligionSector[]
  // > = prisma.$queryRaw`Select "ReligionName" From "ReligionSector"`;
  // const cities: Promise<
  //   Cities[]
  // > = prisma.$queryRaw`Select "CityName" From "Cities" ORDER BY "CityName"`;
  // to prevent data fetch waterfall ( not needed really here, but it does not require extra effort)

  const data: [School[], ReligionSector[], Cities[]] = await Promise.all([
    schools,
    sectors,
    cities,
  ]);

  const arr = Object.entries(data[0]).map((val) => val[1]);

  const religions = data[1].map((val) => val.ReligionName);

  const citiesarr = data[2].map((val) => val.CityName);
  return [arr, religions, citiesarr];
};

export const getAllSchools = async (): Promise<School[]> => {
  "use server"
  const schools: Promise<School[]> = prisma.school.findMany({
    orderBy: { Schoolid: "asc" },
  });
  return schools
}

export const updateSchoolsColumn = async (
  ColumnName: string,
  newValue: string | number,
  key: number
): Promise<any> => {
  "use server";
  var data = {};
  data[ColumnName] = newValue;

  const query = prisma.school.updateMany(
    {
      where:
      {
        Schoolid: key
      },
      data: data
    })

  const execute: any = await query;
  // if (execute != 1) {
  //   // TODO: do something in case of failure
  // }
};

export const addSchoolsRows = async (data: School[]) => {
  "use server";
  const queries = [];
  for (let i = 0; i < data.length; i++) {
    const school: School = data[i];
    const query = prisma.school.create({
      data: school
    });
    queries.push(query);
  }
  const res = await Promise.all([...queries]);
};

export const deleteSchoolRows = async (
  deleted_ids: number[],
  Indexes_Not_Touched: number[]
) => {
  const query: any[] = [];
  for (let i = 0; i < deleted_ids.length; i++) {
    const id: number = deleted_ids[i];
    query.push(prisma.school.deleteMany({ where: { Schoolid: id } }));
  }

  const query_2: any = [];
  for (let j = 0; j < Indexes_Not_Touched.length; j++) {
    const old_id: number = Indexes_Not_Touched[j];
    console.log("old_id %d, new_id: %d", old_id, j + 1)
    query_2.push(
      prisma.school.updateMany({
        where: { Schoolid: old_id },
        data: { Schoolid: j + 1 },
      })
    );
  }

  // i want the schoolid to stay updated in the database as well obviously.
  // also, we want to update only after deletion so that there will not be an error since Schoolid is key.
  const result = await Promise.all([...query]);
  const result_2 = await Promise.all([...query_2])

  return [result, result_2];
};
export const updateSchoolRowsCascading = async (
  deleted_ids: number[],
  Indexes_Not_Touched: number[],
  AllPrograms: Program[],
  AllContacts: SchoolsContact[]
): Promise<null> => {

 

  return prisma.$transaction(async (prisma) => {

    await deleteContactsBySchoolID(deleted_ids, AllContacts)
    await deleteProgramsBySchoolIDCascading(deleted_ids, AllPrograms)
    await updateSchoolRows(deleted_ids, Indexes_Not_Touched)
    return null


  }, { timeout: 50000, maxWait: 50000, })
};

export const updateSchoolRows = async (
  deleted_ids: number[],
  Indexes_Not_Touched: number[]
): Promise<any> => {
  if (deleted_ids.length === 0) { return null }
  // 1. delete schools

  await prisma.school.deleteMany({ where: { Schoolid: { in: deleted_ids } } })

  return null
};

export const getContacts = async () => {
  // The expectation is low amount of data <=1000 in our case so we don't need to care for a particular Schoolid.
  // it will take longer to do seperate queries for each school probably.
  //const schoolsContact:SchoolsContact[] = await prisma.SchoolsContact.findMany({orderBy:{Schoolid:'asc'}})
  //const schoolsContact:SchoolsContact[]= await prisma.$queryRaw`Select * From "SchoolsContact" ORDER BY "Schoolid" LIMIT 2000 `;
  return [];
  //return Object.entries(schoolsContact).map((val) => val[1]);
};

export const selectSchools = async (
  levels: any,
  sectors: any,
  types: any,
  cities: any,
  amount: any
) => {
  "use server";
  const selectedSchools = await prisma.school.findMany({
    where: {
      AND: [
        { ReligiousSector: { in: sectors } }, // Check if "ReligiousSector" is within the provided array
        { City: { in: cities } }, // Check if "City" is within the provided array
      ],
    },
    orderBy: {
      Schoolid: 'asc', // Sort by "schoolid" in ascending order
    },
    select: {
      Schoolid: true, // Only select the "schoolid" field
    },
  });

  return selectedSchools;
};


export const filterSchoolsByCities = async (
  filteringOption: any,
  fieldName: any
) => {
  "use server";
  let selectedSchools;
  if (filterSchoolsByType.length > 0) {
    selectedSchools = await prisma.school.findMany({
      where: {
        City: {
          in: filteringOption,
        },
      },
      orderBy: {
        Schoolid: "asc", // Assuming "Schoolid" is mapped to "schoolId" in your model
      },
    });
  } else {
    selectedSchools = await prisma.school.findMany({
      orderBy: {
        Schoolid: "asc", // Assuming "Schoolid" is mapped to "schoolId" in your model
      },
    });
  }
  return selectedSchools;
};

export const filterSchoolsBySector = async (
  filteringOption: any,
  fieldName: any
) => {
  "use server";

  const selectedSchools = await prisma.school.findMany({
    where: {
      ReligiousSector: {
        in: filteringOption,
      },
    },
    orderBy: {
      Schoolid: "asc", // Assuming "Schoolid" is mapped to "schoolId" in your model
    },
  });
  return selectedSchools;
};

export const filterSchoolsByLevel = async (
  filteringOption: any,
  fieldName: any
) => {
  "use server";

  const selectedSchools = await prisma.school.findMany({
    where: {
      EducationStage: {
        in: filteringOption,
      },
    },
    orderBy: {
      Schoolid: "asc", // Assuming "Schoolid" is mapped to "schoolId" in your model
    },
  });
  return selectedSchools;
};

export const filterSchoolsByType = async (
  filteringOption: any,
  fieldName: any
) => {
  "use server";

  const selectedSchools = await prisma.school.findMany({
    where: {
      SchoolType: {
        in: filteringOption,
      },
    },
    orderBy: {
      Schoolid: "asc", // Assuming "Schoolid" is mapped to "schoolId" in your model
    },
  });
  return selectedSchools;
};

export const getSchoolsByIds = async (id: number[]): Promise<any> => {
  "use server";
  const schools = await prisma.school.findMany({
    where: {
      Schoolid: {
        in: id,
      },
    },
  });
  return schools;
};


export const updateSchoolColumn = async (
  ColumnName: string,
  newValue: string | number,
  key: number
): Promise<any> => {
  "use server";
  var data = {};
  data[ColumnName] = newValue;
  console.log("data: ", data)
  const query = prisma.school.updateMany(
    {
      where:
      {
        Schoolid: key
      },
      data: data
    })
  const execute: any = await query;
};
export const getSchoolsPrograms = async (schoolIds: number[]) => {
  "use server"
  const programs = await prisma.program.findMany({
    where: {
      Schoolid: {
        in: schoolIds
      }
    }
  });
  return programs
}

// הוסף את זה בסוף הקובץ:

export async function updateSchoolStatus(
  schoolId: number, 
  status: string
): Promise<any> {
  try {
    const response = await fetch('/api/schools/updateStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, status })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('Error updating school status:', error);
    throw error;
  }
}