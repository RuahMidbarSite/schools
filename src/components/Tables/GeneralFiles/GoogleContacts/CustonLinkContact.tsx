"use client"
import { School, SchoolsContact } from "@prisma/client";
import { CellValueChangedEvent, ICellRendererParams } from "ag-grid-community";
import { useCallback, useEffect, useState, forwardRef, useContext } from "react";
import { GoogleContactComponent } from "./GoogleContactComponent";
import { UpdateContactConfiguration, callBackdata } from "@/util/Google/GoogleContacts/ContactTypes";
import { getInfo } from "@/db/instructorsrequest";
import { getSchoolsByIds } from "@/db/schoolrequests";
import { TiDelete } from "react-icons/ti";
import { ThemeContext } from "@/context/Theme/Theme";

export interface ExtendedLinkCellContact extends ICellRendererParams<SchoolsContact> {
  GoogleFunctions: (name: string, contextId?: string) => (config: any) => any;
}

interface ListenerInterface {
  type: string,
  data: CellValueChangedEvent<SchoolsContact>
}

export const CustomLinkContact = forwardRef((props: ExtendedLinkCellContact, ref) => {
  const [ListenerActivated, setListenerActivated] = useState(false);
  const { theme } = useContext(ThemeContext)

  const changedValue = useCallback(async ({ type, data }: ListenerInterface) => {
    const row: { data: SchoolsContact } = props.node;
    const event: CellValueChangedEvent<SchoolsContact> = data;
    // אנו משתמשים ב'schools' כי זה כנראה בשימוש בתוך SchoolsTable, אך זה יעבוד גם בטבלה הראשית
    const Update = props.GoogleFunctions("update_contact", "schools");
    const Delete = props.GoogleFunctions("delete_contact", "schools");
    
    if (event.data && event.data.Contactid === row.data.Contactid) {
        const info = await getInfo();
        const finalClientId = info?.clientId || process.env.NEXT_PUBLIC_CLIENT_ID;
        const sessionToken = sessionStorage.getItem('google_token_schools');

        var args: UpdateContactConfiguration = {
          token: sessionToken || undefined, 
          clientId: finalClientId,
          developerKey: info?.developerKey,
          data: { row: row.data },
          callbackFunction: (data: callBackdata) => { }
        }

        if (event.colDef.field === "GoogleContactLink" && row.data.GoogleContactLink === "") {
           args.data.row.GoogleContactLink = event.oldValue;
           Delete(args);
        }
        else if (row.data.GoogleContactLink && event.colDef.field !== "IsRepresentive") {
          const school: School = (await getSchoolsByIds([row.data.Schoolid]))[0];
          args.data = { ...args.data, school: school };
          Update(args);
        }
    }
  }, [props])

  useEffect(() => {
    if (props.api && !ListenerActivated) {
        setListenerActivated(true);
        props.api.addEventListener("Contact_Update", changedValue)
    }
    return () => {
        props.api?.removeEventListener("Contact_Update", changedValue)
    }
  }, [props.api, ListenerActivated, changedValue]);

  const getTextInstructors = useCallback(() => {
    if (props.colDef!.field === "GoogleContactLink") {
      return props.data.GoogleContactLink ? "איש קשר גוגל" : "";
    }
    return "";
  }, [props.colDef, props.data.GoogleContactLink])

  const getValue = useCallback(() => {
    return props.data[props.colDef!.field as string];
  }, [props.colDef, props.data]);

  const deleteFile = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const row: { data: SchoolsContact } = props.node;
    const info = await getInfo();
    const finalClientId = info?.clientId || process.env.NEXT_PUBLIC_CLIENT_ID;
    
    // שליפה מהסשן
    const sessionToken = sessionStorage.getItem('google_token_schools');

    const Delete = props.GoogleFunctions("delete_contact", "schools");
    
    Delete({
        token: sessionToken || undefined, 
        clientId: finalClientId,
        developerKey: info?.developerKey,
        data: { row: row.data },
        callbackFunction: (data: callBackdata) => {
            props.node.setDataValue(props.colDef.field!, "");
        }
    });

  }, [props.node, props.GoogleFunctions, props.colDef])

  return (
    <div>
      {getTextInstructors() !== "" ? (
        <div>
          <div className="float-right">
            <button onClick={deleteFile} style={{ zIndex: 100, position: 'relative' }}> 
                <TiDelete className={theme === "dark-theme" ? "fill-slate-200 hover:fill-slate-300" : "fill-gray-800 hover:fill-gray-500"} /> 
            </button>
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