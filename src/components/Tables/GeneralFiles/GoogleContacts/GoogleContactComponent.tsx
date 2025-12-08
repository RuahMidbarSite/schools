import { getInfo } from "@/db/instructorsrequest";
import { CellValueChangedEvent, ICellRendererParams, RowNode } from "ag-grid-community";
import { ExtendedLinkCellContact } from "./CustonLinkContact";
import { authResult } from "@/util/Google/typeDefs";
import { callBackdata } from "@/util/Google/GoogleContacts/ContactTypes";
import { getSchoolContacts, updateContactColumn } from "@/db/contactsRequests";
import { MdContactEmergency } from "react-icons/md";
import { School, SchoolsContact } from "@prisma/client";
import { getSchoolsByIds } from "@/db/schoolrequests";
import { useCallback, useEffect, useState } from "react";
import { getFromStorage } from "@/components/Auth/Storage/AuthContactsStorage";
import { OAuthTokenResponseGoogle } from "@/app/googleCallback/page";
export const GoogleContactComponent = (props: ExtendedLinkCellContact) => {

  const [ListenerActivated, setListenerActivated] = useState(false);


  const handleContactUpload = useCallback(async (event) => {
    const contacts:number[]= (event.data as SchoolsContact[]).map((
val)=>val.Contactid)
    console.log(event)
    if(!contacts.includes(props.data.Contactid)) { return}
    Promise.all([getInfo(), getFromStorage()]).then(async ([info, Res]) => {
      console.log(info)
      const Upload = props.GoogleFunctions("upload")
      const data: SchoolsContact = props.data
      const school: School = (await getSchoolsByIds([data.Schoolid]))[0]

      if (Res === null || typeof Res === "undefined") {
        Upload({
          clientId: info.clientId,
          developerKey: info.developerKey,
          data: {
            name: props.data.FirstName.concat(" ", data.Role, " ", school.EducationStage, " ", school.SchoolName, " ", school.City),
            cellPhone: props.data.Cellphone,
          },
          callbackFunction: (data: callBackdata) => {
            const type: string | undefined = props.colDef!.field;
            const updatedvalue: string = "https://contacts.google.com/".concat(data.resourceName)
            // here we update the table.
            props.node.setDataValue(type as string, updatedvalue);

            updateContactColumn(type as string, updatedvalue, props.data.Contactid)
          }
        });
      } else {
        const AuthObject: OAuthTokenResponseGoogle = Res.authResult;
        const token = AuthObject.access_token;
        Upload({
          clientId: info.clientId,
          developerKey: info.developerKey,
          token: token,
          data: {
            name: props.data.FirstName.concat(" ", data.Role, " ", school.EducationStage, " ", school.SchoolName, " ", school.City),
            cellPhone: props.data.Cellphone,
          },
          callbackFunction: (data: callBackdata) => {

            const type: string | undefined = props.colDef!.field;
            const updatedvalue = "https://contacts.google.com/".concat(data.resourceName)
            // here we update the table.
            props.node.setDataValue(type as string, updatedvalue);

            updateContactColumn(type as string, updatedvalue, props.data.Contactid)
          }
        });
      }



    })


  }, [props]);

  const newContactReaction = useCallback(async (event: any) => {
   if(event?._reactName==='onClick') {
      handleContactUpload({data:[props.data]})
   }
    console.log(event)
    handleContactUpload({data:event.data}).then((res) => {
      console.log('done')
    })

  }, [handleContactUpload,props.data])

  useEffect(() => {

    const addListener = () => {
      if (props.api && !ListenerActivated) {
        setListenerActivated(true);
        props.api.addEventListener("New_Contacts", newContactReaction)
      }
    }
    addListener()
    return () => {

      props.api.removeEventListener("New_Contacts", newContactReaction)
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.api])

  return (
    <div>
      <div className="flex justify-center items-center h-full">
        <button id="upload-file" onClick={newContactReaction}>


          <MdContactEmergency className="w-[25px] h-[25px] fill-gray-400 hover:fill-gray-300 hover:cursor-pointer" />
        </button>
      </div>
    </div>
  );
};
