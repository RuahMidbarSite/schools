"use client"
import { Guide, School, SchoolsContact } from "@prisma/client";
import { CellValueChangedEvent, ICellRendererParams } from "ag-grid-community";
import { ChangeEvent, useCallback, useEffect, useRef, useState, Component, forwardRef, useContext } from "react";
import { GoogleContactComponent } from "./GoogleContactComponent";
import { DeleteContactConfiguration, UpdateContactConfiguration, UploadContactConfiguration, callBackdata } from "@/util/Google/GoogleContacts/ContactTypes";
import { getEnv, getInfo, updateInstructorsColumn } from "@/db/instructorsrequest";
import { getSchoolsByIds } from "@/db/schoolrequests";
import { getFromStorage } from "@/components/Auth/Storage/AuthContactsStorage";
import { updateProgramsColumn } from "@/db/programsRequests";
import { getAuth } from "@/db/authRequests";
import { OAuthTokenResponseGoogle } from "@/app/googleCallback/page";
import { TiDelete } from "react-icons/ti";
import { ThemeContext } from "@/context/Theme/Theme";


export interface ExtendedLinkCellContact extends ICellRendererParams<SchoolsContact> {
  GoogleFunctions: (name: "upload" | "delete" | "update") => (config: UpdateContactConfiguration | UploadContactConfiguration | DeleteContactConfiguration) => any;
}
interface ListenerInterface {
  type: string,
  data: CellValueChangedEvent<SchoolsContact>

}
export const CustomLinkContact = forwardRef((props: ExtendedLinkCellContact, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [ListenerActivated, setListenerActivated] = useState(false);
  const { theme } = useContext(ThemeContext)
  const changedValue = useCallback(async ({ type, data }: ListenerInterface) => {
    const row: { data: SchoolsContact } = props.node;
    const event: CellValueChangedEvent<SchoolsContact> = data
    const Update = props.GoogleFunctions("update")
    const Delete = props.GoogleFunctions("delete")
    if (event.data && event.data.Contactid === row.data.Contactid) {
      Promise.all([getInfo(), getFromStorage()]).then(async ([info, Res]) => {
        var args: UpdateContactConfiguration = {
          token: Res ? Res.authResult.access_token : undefined,
          clientId: info.clientId,
          developerKey: info.developerKey,
          data: { row: row.data },
          callbackFunction: (data: callBackdata) => {
          }

        }

        if (event.colDef.field === "GoogleContactLink" && row.data.GoogleContactLink === "") {

          // otherwise it will be null
          args.data.row.GoogleContactLink = event.oldValue
          Delete(args)
        }
        else if (row.data.GoogleContactLink !== null && row.data.GoogleContactLink !== "" && event.colDef.field !== "IsRepresentive") {
          const school: School = (await getSchoolsByIds([row.data.Schoolid]))[0]
          args.data = { ...args.data, school: school }
          Update(args)
        }

      })




    }

  }, [props])

  useEffect(() => {

    const addListener = () => {
      if (props.api && !ListenerActivated) {
        setListenerActivated(true);
        props.api.addEventListener("Contact_Update", changedValue)
      }
    }
    addListener()
    return () => {

      props.api.removeEventListener("Contact_Update", changedValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.api]);

  const getTextInstructors = useCallback(() => {
    const value: string | undefined = props.colDef!.field;
    if (value === "GoogleContactLink") {

      if (!Boolean(props.data.GoogleContactLink)) {

        return "";
      }
      return "איש קשר גוגל";
    }

  }, [props.colDef, props.data.GoogleContactLink])



  const getValue = useCallback(() => {
    // we update the value from inside the google drive picker.
    const value: string | undefined = props.colDef!.field;
    return props.data[value as string];
  }, [props.colDef, props.data]);

  const deleteFile = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const row: { data: SchoolsContact } = props.node;
    getAuth('Contacts').then(async (res_1) => {
      const Res: OAuthTokenResponseGoogle | undefined = res_1.Auth

      const info: any = await getInfo();
      var args = {
        token: Res?.access_token,
        clientId: info.clientId,
        developerKey: info.developerKey,
        data: { row: row.data },
        callbackFunction: (data: callBackdata) => {
            const field: string | undefined = props.colDef.field;
            props.node.setDataValue(field as string, "");
          
        }

      }
      const Delete = props.GoogleFunctions("delete")
      Delete(args)
    })

  }, [getValue, props.colDef.field, props.node,])

  return (
    <div>
      {getTextInstructors() !== "" ? (
        <div>
          <div className=" float-right">
            <button onClick={(event) => deleteFile(event)}> <TiDelete className={theme === "dark-theme" ? "fill-slate-200 hover:fill-slate-300" : "fill-gray-800 hover:fill-gray-500"}> </TiDelete> </button>
          </div>
          <a
            href={getValue()}
            target="_blank"
            className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
          >
            {getTextInstructors()}
          </a>
        </div>

      ) : (
        <GoogleContactComponent {...props} />
      )}
    </div>
  );
});

CustomLinkContact.displayName = "CustomLinkContact"