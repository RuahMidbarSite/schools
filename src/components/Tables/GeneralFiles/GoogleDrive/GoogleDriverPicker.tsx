"use client";
import React, { useCallback } from "react";
import { IoMdCloudUpload } from "react-icons/io";
import { getEnv, getInfo, updateInstructorsColumn } from "@/db/instructorsrequest";
import { updateProgramsColumn } from "@/db/programsRequests"
import { PickerConfiguration, authResult, folderStructure } from "@/util/Google/typeDefs";
import { ExtendedLinkCell } from "./CustomLinkDrive";
import { Guide, Program } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { getFromStorage as getProgramAuth } from "@/components/Auth/Storage/AuthDrivePrograms";
import { getFromStorage as getGuidesAuth } from "@/components/Auth/Storage/AuthDriveGuides";
import { updateStorage as updateStoragePrograms } from "../../ProgramsTable/Storage/ProgramsDataStorage";
import { updateStorage as updateStorageGuides } from "../../GuidesTable/Storage/GuidesDataStorage";

interface ExtendedProgram extends ICellRendererParams<Program> {
  AuthenticateActivate: (config: 'open' | 'delete') => (args: any) => {};
  type: "Program" | "Guide"
}
interface ExtendedGuideUpload extends ICellRendererParams<Guide> {
  AuthenticateActivate: (config: 'open' | 'delete') => (args: any) => {};
  type: "Program" | "Guide"
}

const Translation: Record<string, string> = { 
  "CV": "קורות חיים", 
  "PoliceApproval": "אישור משטרה", 
  "Insurance": "ביטוח", 
  "Documents": "מסמכים", 
  "Agreement": "הסכם", 
  "Other_Documents": "מסמכים" 
}

const GoogleDriverPicker = (props: ExtendedLinkCell) => {

  const getObject = useCallback((info: any, env: string): PickerConfiguration => {
    var folder_structure: folderStructure
    const NameProgram = "מחלקת שיווק ומכירות"
    const Name_Guides = "מסמכי מדריכים"
    const unknownname = "שם לא ידוע"
    
    if (props.type === "Program") {
      const prop = props as ExtendedProgram
      const root_parent = NameProgram
      const year = prop.data.Year || ""
      const area = prop.data.District || ""
      const city = prop.data.CityName || ""
      const school_name = prop.data.SchoolName || ""
      folder_structure = { parents_folders_by_left_to_right_order: [root_parent, year, area, city, school_name] }

    }
    else {
      const prop = props as ExtendedGuideUpload
      const root_parent = Name_Guides
      const area = prop.data.Area || ""
      const city = prop.data.City || ""
      const name = prop.data.FirstName ? (prop.data.LastName ? props.data.FirstName.concat(' ', prop.data.LastName) : props.data.FirstName) : unknownname
      const field = Translation[props.colDef.field || ""] || "מסמכים"
      folder_structure = { parents_folders_by_left_to_right_order: [root_parent, area, city, name, field] }
    }

    const obj: PickerConfiguration = {
      clientId: info.clientId,
      developerKey: info.developerKey,
      viewId: "DOCS",
      showUploadView: true,
      showUploadFolders: true,
      setIncludeFolders: true,
      supportDrives: true,
      setSelectFolderEnabled: true,
      multiselect: true,
      customScopes: ["https://www.googleapis.com/auth/drive"],
      
      setOrigin: env === 'production' 
        ? "https://ruahmidbarproject.vercel.app" 
        : "http://localhost:3666",

      callbackFunction: (data: any) => {
        if (data.action === "picked") {
          const value: string | undefined = props.colDef.field;
          const docs = data.docs.filter((val: any) => val.uploadState === "success")
          const doc_list = docs.length > 1 ? docs.map((doc: any) => doc.url).join(',') : docs[0]?.url
          
          if (value) {
             props.node.setDataValue(value, doc_list);

             if (props.type === 'Program') {
               updateProgramsColumn(value, doc_list, props.data.Programid);
             } else {
               updateInstructorsColumn(value, doc_list, props.data.Guideid);
             }
          }

          // update cache..
          if (props.type == 'Program') {
            const future_data: Program[] = [];
            props.api.forEachNode((node: any) => {
              future_data.push(node.data);
            });
            updateStoragePrograms({ Programs: future_data })

          } else {
            const future_data: Guide[] = [];
            props.api.forEachNode((node: any) => {
              future_data.push(node.data);
            });
            updateStorageGuides({ Guides: future_data })
          }
        }
      },
      folderStructure: folder_structure,
    }
    return obj
  }, [props])

  const handleOpenPicker = useCallback(async () => {
    const [res_1, res_2] = await Promise.all([getProgramAuth(), getGuidesAuth()]);
    const Res: any = props.type === "Program" ? res_1.authResult : res_2.authResult
    const openPicker = props.AuthenticateActivate('open');
    const info: any = await getInfo();
    const env = await getEnv()
    
    if (!Res) {
      openPicker(getObject(info, env))
    } else {
      const token = Res.access_token;
      var object = { ...getObject(info, env), token: token }
      openPicker(object);
    }
  }, [getObject, props]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <button
        id="upload-file"
        onClick={() => handleOpenPicker()}
        className="flex justify-center items-center h-full"
      >
        <IoMdCloudUpload className="w-[45px] h-[45px] fill-gray-400 hover:fill-gray-300 hover:cursor-pointer" />
      </button>
    </div>
  );
};

export default GoogleDriverPicker;