"use server";
import prisma from "@/db/prisma";
import {
  Program,
  Cities,
  Prisma,
  PrismaClient,
  Assigned_Guide,
  Guide,
  ReligionSector,
  Program_Schedule,
  School,
  Guides_ToAssign,
  ColorCandidate
} from "@prisma/client"; // look at this type to know the fields in the table.
import { deleteAssignedInstructorsManyAccordingToProgramToProgramIds, removeAllColorsCandidatesByProgramids, removeAssignCandidatesManyAccordingToProgramIds, removedAssignCandidate } from "./instructorsrequest";
import { PrismaClientRustPanicError } from "@prisma/client/runtime/library";

export const updateProgram = async (
  ColumnName: string,
  newValue: any,
  key: string
): Promise<any> => {
  "use server";

  var data = {};
  data[ColumnName] = newValue;

  const updateQuery = prisma.program.updateMany({
    where: {
      Programid: parseInt(key),
    },
    data: data,
    // Use string interpolation within the data object

  });
  const execute = await updateQuery;

};

//TODO: do to the same for all add programs(use promise.all)
export const addProgramsRows = async (data: Program[]) => {
  "use server";
  var row: Program;
  var queries = [];
  for (let i = 0; i < data.length; i++) {
    const program: Program = data[i];

    queries.push(
      prisma.program.create({
        data: program,
      })
    );
  }

  const res: any = await Promise.all([...queries]);
};




/** 
  When deleting in programs, you also need to delete other tables.
  In summation:
  1. Delete the programs
  2. Delete all ToBeAssigned for that program
   3. Delete All Assigned for that program
   4. Delete Color Candidates "" ""
 */
export const deleteProgramsCascading = async (deleted_ids: number[],
  New_data: Program[],
  old_ids: number[]): Promise<null> => {
  if (deleted_ids.length === 0) { return null }
  const query_2: any = [];

  return prisma.$transaction(
    async (prisma) => {
      // Perform operations concurrently where possible
      const program_ids = deleted_ids;

      await deleteAssignedInstructorsManyAccordingToProgramToProgramIds(program_ids)
      await removeAssignCandidatesManyAccordingToProgramIds(program_ids)
      await removeAllColorsCandidatesByProgramids(program_ids)
      await deleteProgramsRows(deleted_ids, New_data, old_ids)

      return null
    },
    {
      timeout: 100000,
      maxWait: 100000,
    }
  );




}
export const deleteProgramsBySchoolIDCascading = async (deleted_ids: number[], programs: Program[]): Promise<null> => {
  if (deleted_ids.length == 0) { return null }
  const remaining_programs = programs.filter((program) => deleted_ids.includes(program.Schoolid))
  const deleted_programs_ids = remaining_programs.map((val) => val.Programid)
  const remaining = programs.filter((program) => !deleted_programs_ids.includes(program.Programid))
  const remaining_ids = remaining.map((val) => val.Programid)

  await deleteProgramsCascading(deleted_programs_ids, remaining, remaining_ids)

  return null
}


export const deleteProgramsRows = async (
  deleted_ids: number[],
  New_data: Program[],
  old_ids: number[]
): Promise<{count:number}> => {
  if (deleted_ids.length === 0) { return null }
 
  return prisma.program.deleteMany({ where: { Programid: { in: deleted_ids } } })

};

export const updateProgramsColumn = async (
  ColumnName: string,
  newValue: string,
  key: number
): Promise<any> => {
  "use server";

  var data = {};
  data[ColumnName] = newValue;
  const updateQuery = prisma.program.updateMany({
    where: {
      Programid: key,
    },

    data: data,


  });

  const execute = await updateQuery;

};

export const getSchoolsPrograms = async () => {
  "use server"
  const uniqueSchoolNames = await prisma.program.findMany({
    select: {
      SchoolName: true,
    },
    distinct: ['SchoolName'],
  });

  const schoolNames = uniqueSchoolNames.map(program => program.SchoolName).filter((name) => name !== null);;

  const schools = await prisma.school.findMany({
    where: {
      SchoolName: { in: schoolNames },
    },
  });

  return schools

}

export const getPrograms = async (): Promise<Program[]> => {
  "use server";
  const Guides: Promise<Program[]> = prisma.program.findMany({
    orderBy: {
      Programid: "asc", // Assuming "Programid" maps to "programId" in your model
    },
    take: 10000,
  });

  return Guides;
};

export const addProgram = async (programId: any) => {
  "use server";
  var row
  row["Programid"] = programId
  const query: any = await prisma.program.create({
    data: row,
    select: {
      Programid: true, // Include programId in the returned object (optional)
    },
  });

  const newProgram = await prisma.program.findMany({
    where: { Programid: programId },
  });

  return newProgram[0];
};

export const deleteProgram = async (ProgramId: string) => {
  "use server";

  // have to use raw string for variable column
  const deletedProgram = await prisma.program.deleteMany({
    where: {
      Programid: parseInt(ProgramId), // Assuming ProgramId is a valid integer or string (depending on your model definition)
    },
  });
};

export const getAssignedInstructores = async (ProgramId: number) => {
  "use server";
  const instructors: { Guideid: number }[] = await prisma.assigned_Guide.findMany({
    where: {
      Programid: ProgramId, // Assuming ProgramId is a valid integer or string (depending on your model definition)
    },
    select: {
      Guideid: true,
    },
  });
  return instructors;
};

export const getInstractorsDetails = async (InstructorId: string) => {
  "use server";
  const instructorDetails = await prisma.guide.findUnique({
    where: {
      Guideid: parseInt(InstructorId), // Assuming InstructorId is a valid integer or string (depending on your model definition)
    },
    select: {
      Guideid: true, // Include guideId in the returned object (optional)
      FirstName: true,
      LastName: true,
      CellPhone: true,
      City: true,
      CV: true,
    },
  });
  return instructorDetails;
};

export const getallCities = async (): Promise<string[]> => {
  const cities: { CityName: string }[] = await prisma.cities.findMany({
    orderBy: {
      CityName: "asc", // Assuming "CityName" maps to "cityName" in your model
    },
    select: {
      CityName: true,
    },
  });
  return cities.map((val) => val.CityName);
};
export const getProgramWithId = async (id: number): Promise<Program> => {

  "use server";
  const Program: Promise<Program[]> = prisma.program.findMany({
    where: {
      Programid: id
    }

  });

  return Program[0]


}

export const getProgramSchedule = async (id: number): Promise<Program_Schedule> => {

  const Schedule: Promise<Program_Schedule> = prisma.program_Schedule.findUnique({
    where: {
      Programid: id
    }

  });
  return Schedule

}


export const getProgramsBySchool = async (schoolName: string) => {
  "use server"
  const programs = await prisma.program.findMany({
    where: {
      SchoolName: schoolName,
    },
  });
  return programs
}
