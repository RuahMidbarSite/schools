"use server";
import prisma from "@/db/prisma";
import {
  SchoolsContact,
  Cities,
  Prisma,
  PrismaClient,
  ReligionSector,
  School,
} from "@prisma/client"; // look at this type to know the fields in the table.

// returns the schools and the cities and sectors for the select portion.
export const getContactsAndCities = async ({
  id,
}: {
  id: number;
}): Promise<[SchoolsContact[], string[]]> => {
  "use server";
  var contacts: Promise<SchoolsContact[]>;
  if (id >= 0) {
    contacts = prisma.schoolsContact.findMany({
      where: {
        Contactid: id, // Assuming "contactid" corresponds to "Contactid"
      },
      orderBy: {
        Contactid: "asc", // Sort by contactid in ascending order
      },
      take: 2000, // Limit results to 2000
    });
  } else {
    contacts = prisma.schoolsContact.findMany({
      orderBy: {
        Contactid: "asc", // Sort by contactid in ascending order
      },
      take: 2000, // Limit results to 2000
    });
  }
  const cities: Promise<{ CityName: string }[]> = prisma.cities.findMany({
    orderBy: {
      CityName: "asc", // Sort by cityName in ascending order
    },
    select: {
      CityName: true, // Only select the cityName field
    },
  });
  // to prevent data fetch waterfall ( not needed really here, but it does not require extra effort)

  const data: [SchoolsContact[], { CityName: string }[]] = await Promise.all([
    contacts,
    cities,
  ]);

  const arr = Object.entries(data[0]).map((val) => val[1]);

  const citiesarr = data[1].map((val) => val.CityName);
  return [arr, citiesarr];
};


export const getSchoolContacts = async (
  Schoolid: number
): Promise<SchoolsContact[]> => {
  const data: SchoolsContact[] = await prisma.schoolsContact.findMany({
    where: {
      Schoolid: Schoolid, // Assuming "schoolid" corresponds to "Schoolid"
    },
    orderBy: {
      Contactid: "asc", // Sort by contactid in ascending order
    },
    take: 2000, // Limit results to 2000
  });

  const arr = Object.entries(data)?.map((val) => val[1]);
  return arr;
};

export const getAllContacts = async (): Promise<SchoolsContact[]> => {
  const data: Promise<SchoolsContact[]> = prisma.schoolsContact.findMany({
    orderBy: {
      Contactid: "asc", // Sort by contactid in ascending order
    },
    take: 10000, // Limit results to 5000
  });

  return data
};

export const updateContactColumn = async (
  ColumnName: string,
  newValue: any,
  key: number
): Promise<any> => {
  "use server";
  var row: any = {};
  row[ColumnName] = newValue;
  // have to use raw string for variable column
  await prisma.schoolsContact.updateMany({
    where: {
      Contactid: key, // Assuming "contactid" is the primary key
    },
    data:
      row, // Dynamic field update based on columnName

  }).then((res) => {
    console.log(res)
  }).catch((err) => console.error(err))


};

export const deleteContactsRows = async (
  deleted_ids: number[],
  New_data: SchoolsContact[],
  old_ids: number[]
) => {


  await prisma.schoolsContact.deleteMany({
    where: {
      Contactid: { in: deleted_ids }, // Assuming "contactid" is the primary key
    },
  })


};

export const deleteContactsBySchoolID = async (deleted_ids: number[], AllContacts: SchoolsContact[]): Promise<{ count: number }> => {
  if (deleted_ids.length === 0) { return null }
  const deleted_contacts = AllContacts.filter((contact: SchoolsContact) => deleted_ids.includes(contact.Schoolid))
  const deleted_contacts_ids = deleted_contacts.map((contact) => contact.Contactid)
  const remaining_data = AllContacts.filter((contact: SchoolsContact) => !!!deleted_ids.includes(contact.Schoolid))
  const old_ids = remaining_data.map((val) => val.Contactid)
  await deleteContactsRows(deleted_contacts_ids, remaining_data, old_ids)
  return null
}

// Since we are in the small table, we need to know how much entries are in the table itself so that we can
// reorder the ids.
export const deleteContactsRowsMini = async (
  deleted_ids: number[],
  Indexes_Not_Touched: number[],
  new_AmountOfContacts: number
) => {
  const query: any[] = [];
  prisma.$transaction((async (prisma) => {

    for (let i = 0; i < deleted_ids.length; i++) {
      const id: number = deleted_ids[i];
      query.push(
        prisma.schoolsContact.deleteMany({
          where: {
            Contactid: id, // Assuming "contactid" is the primary key
          },
        })
      );
    }

    const query_2: any = [];
    for (let j = 0; j < new_AmountOfContacts; j++) {
      const old_id: number = Indexes_Not_Touched[j];
      query_2.push(
        prisma.schoolsContact.updateMany({
          where: {
            Contactid: old_id, // Assuming "contactid" is the primary key
          },
          data: {
            Contactid: j + 1, // Set the new "contactid" value
          },
        })
      );
    }

    // i want the schoolid to stay updated in the database as well obviously.
    // also, we want to update only after deletion so that there will not be an error since Contactid is key.
    const result = await Promise.all([...query]);
    const result_2 = await Promise.all([...query_2]);

    return [result, result_2];
  }), { timeout: 10000, maxWait: 5000 }).then((res) => {
    console.log('Transaction completed successfully.');
    return res
  }).catch((error) => console.error('Transaction failed and was rolled back:', error))

};
export const addContactRows = async (data: SchoolsContact[]) => {
  "use server";
  var queries = [];
  for (let i = 0; i < data.length; i++) {
    const schoolsContact: SchoolsContact = data[i];

    queries.push(
      prisma.schoolsContact.create({
        data: schoolsContact,
      })
    );
  }
  const res = await Promise.all([...queries]);
};

export const selectContacts = async (schoolsid: any): Promise<SchoolsContact[]> => {
  "use server";
  const contacts: Promise<SchoolsContact[]> = prisma.schoolsContact.findMany({
    where: {
      Schoolid: {
        in: schoolsid, // Check if "schoolid" is within the provided array
      },
    },
    orderBy: {
      Schoolid: "asc", // Sort by "schoolid" in ascending order
    },
  });

  return contacts;
};

export const getContact = async (contactid: number): Promise<SchoolsContact> => {
  const contact = prisma.schoolsContact.findFirst({ where: { Schoolid: contactid } })
  return contact
}
export const getContactBySchoolID = async (schoolid: number): Promise<SchoolsContact> => {
  const contact = prisma.schoolsContact.findFirst({ where: { Schoolid: schoolid } })
  return contact
}
export const updateStatuses = async (status: string, contactsId: number[]) => {
  "use server";
  await prisma.schoolsContact.updateMany({
    where: {
      Contactid: {
        in: contactsId,
      },
    },
    data: {
      Status: status,
    },
  });
};

// this is used in min-table so that we can add new contacts without ID messing.
export const getCountContacts = async (): Promise<number> => {
  return prisma.schoolsContact.count()

}