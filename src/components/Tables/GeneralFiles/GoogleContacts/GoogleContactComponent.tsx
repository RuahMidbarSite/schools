import { getInfo } from "@/db/instructorsrequest";
import { updateContactColumn } from "@/db/contactsRequests";
import { MdContactEmergency } from "react-icons/md";
import { School, SchoolsContact } from "@prisma/client";
import { getSchoolsByIds } from "@/db/schoolrequests";
import { useCallback, useEffect, useState } from "react";
import { ExtendedLinkCellContact } from "./CustonLinkContact";
import { callBackdata } from "@/util/Google/GoogleContacts/ContactTypes";

export const GoogleContactComponent = (props: ExtendedLinkCellContact) => {

  const [ListenerActivated, setListenerActivated] = useState(false);

  const handleContactUpload = useCallback(async (event) => {
    if (!event || !event.data) return;

    const contacts: number[] = (event.data as SchoolsContact[]).map((val) => val.Contactid);
    if (!contacts.includes(props.data.Contactid)) return;

    // בדיקה שהפונקציה קיימת
    if (!props.GoogleFunctions) {
        console.error("Critical Error: GoogleFunctions is missing in props!", props);
        alert("שגיאה פנימית: מנגנון החיבור לגוגל לא הועבר לטבלה.");
        return;
    }

    const info = await getInfo();
    const finalClientId = info?.clientId || process.env.NEXT_PUBLIC_CLIENT_ID;
    const finalDevKey = info?.developerKey || process.env.NEXT_PUBLIC_API_KEY;

    if (!finalClientId) {
        alert("חסר Client ID");
        return;
    }

    const CreateContact = props.GoogleFunctions("create_contact", "schools"); 
    
    const data: SchoolsContact = props.data;
    const schoolsList = await getSchoolsByIds([data.Schoolid]);
    const school: School | undefined = schoolsList && schoolsList.length > 0 ? schoolsList[0] : undefined;

    let fullName = props.data.FirstName || "";
    if (data.Role) fullName += " " + data.Role;
    if (school) {
       if (school.EducationStage) fullName += " " + school.EducationStage;
       if (school.SchoolName) fullName += " " + school.SchoolName;
       if (school.City) fullName += " " + school.City;
    }

    CreateContact({
        clientId: finalClientId,
        developerKey: finalDevKey,
        data: {
            name: fullName,
            cellPhone: props.data.Cellphone,
        },
        callbackFunction: (responseData: callBackdata) => {
            const type: string | undefined = props.colDef!.field;
            const updatedvalue: string = "https://contacts.google.com/".concat(responseData.resourceName);
            props.node.setDataValue(type as string, updatedvalue);
            updateContactColumn(type as string, updatedvalue, props.data.Contactid);
        }
    });

  }, [props]);

  const newContactReaction = useCallback(async (event: any) => {
    if (event && event.stopPropagation) event.stopPropagation();
    if (event?._reactName === 'onClick') {
      handleContactUpload({ data: [props.data] });
    } else {
      handleContactUpload({ data: event.data });
    }
  }, [handleContactUpload, props.data]);

  useEffect(() => {
    if (props.api && !ListenerActivated) {
      setListenerActivated(true);
      props.api.addEventListener("New_Contacts", newContactReaction);
    }
    return () => {
      props.api?.removeEventListener("New_Contacts", newContactReaction);
    }
  }, [props.api, ListenerActivated, newContactReaction]);

  return (
    <div className="flex justify-center items-center h-full">
        <button type="button" onClick={newContactReaction} className="focus:outline-none">
          <MdContactEmergency className="w-[25px] h-[25px] fill-gray-400 hover:fill-gray-300 hover:cursor-pointer" />
        </button>
    </div>
  );
};