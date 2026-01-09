import { Guide } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { ChangeEvent, useCallback, useContext, useState } from "react";
import { Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "ag-grid-community/styles/ag-grid.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { IoMdCloudUpload } from "react-icons/io";
import GoogleDriverPicker from "./GoogleDriverPicker";
import { PickerConfiguration, authResult } from "@/util/Google/typeDefs";
import { TiDelete } from "react-icons/ti";
import { AuthDriveStore, getFromStorage as getProgramAuth } from "@/components/Auth/Storage/AuthDrivePrograms";
import { getFromStorage as getGuidesAuth } from "@/components/Auth/Storage/AuthDriveGuides";
import { getEnv, getInfo, updateInstructorsColumn } from "@/db/instructorsrequest";
import { TokenResponse } from "@react-oauth/google";
import { updateProgramsColumn } from "@/db/programsRequests";
import { ThemeContext } from "@/context/Theme/Theme";
import { OAuthTokenResponseGoogle } from "@/app/googleCallback/page";

export interface ExtendedLinkCell extends ICellRendererParams {
  AuthenticateActivate: (config: 'open' | 'delete') => (args) => {};
  type: "Program" | "Guide"
}

export const CustomLinkDrive = (props: ExtendedLinkCell) => {
  const deleteFunction = props.AuthenticateActivate('delete')
  const { theme } = useContext(ThemeContext)
  
  const getValue = useCallback(() => {
    const value: string | undefined = props.colDef!.field;
    return props.data[value as string];
  }, [props.colDef, props.data]);

  const [Value, setValue] = useState(getValue())

  const getTextInstructors = useCallback(() => {
    const value: string | undefined = props.colDef!.field;
    if (value === "Proposal") return !Boolean(props.data.Proposal) ? "" : "הצעה";
    if (value === "Documents") return !Boolean(props.data.Documents) ? "" : "מסמכים";
    if (value === "PoliceApproval") return !Boolean(props.data.PoliceApproval) ? "" : "משטרה";
    if (value === "Insurance") return !Boolean(props.data.Insurance) ? "" : "ביטוח";
    if (value === "Aggrement") return !Boolean(props.data.Aggrement) ? "" : "הסכם";
    if (value === "CV") return !Boolean(props.data.CV) ? "" : "קורות חיים";
    if (value === "Other_Documents") return !Boolean(props.data.Other_Documents) ? "" : "תעודה";
  }, [props.colDef, props.data]);

  function onChange(event: ChangeEvent<HTMLInputElement>): void {}

  const deleteFile = useCallback((event: React.MouseEvent<HTMLButtonElement>, val, index) => {
    Promise.all([getProgramAuth(), getGuidesAuth()]).then(async ([res_1, res_2]) => {
      const Res: OAuthTokenResponseGoogle | undefined = props.type === "Program" ? res_1.authResult : res_2.authResult
      const info: any = await getInfo();
      const env = await getEnv()
      var args = {
        token: Res?.access_token,
        clientId: info.clientId,
        developerKey: info.developerKey,
        customScopes: ["https://www.googleapis.com/auth/drive"],
        data: val,
        callbackFunction: (data: { result: "Success", data: any } | { result: "Error", data: any }) => {
          if (data.result === "Success") {
            const field: string | undefined = props.colDef.field;
            let value: string[] = getValue().split(',')
            value.splice(index, 1)
            let result = value.length > 0 ? value.join(',') : ""
            props.node.setDataValue(field as string, result);
            if (props.type === 'Program') {
              updateProgramsColumn(field as string, result, props.data.Programid);
            } else {
              updateInstructorsColumn(field as string, result, props.data.Guideid);
            }
          }
        }
      }
      deleteFunction(args)
    })
  }, [deleteFunction, getValue, props.colDef.field, props.data.Guideid, props.data.Programid, props.node, props.type])

  const getLinks = useCallback(() => {
    const text = getTextInstructors()
    if (!text) { return "" }
    const value = getValue().split(',')
    
    if (value.length == 1) {
      return (<div key={1} >
        <div className=" float-right">
          <button onClick={(event) => deleteFile(event, value[0], 0)}> <TiDelete className={theme === "dark-theme" ? "fill-slate-200 hover:fill-slate-300" : "fill-gray-800 hover:fill-gray-500"}> </TiDelete> </button>
        </div>
        <a className="" key={1} href={value[0]} target='_blank'>{text} </a>
      </div>)
    } else {
      return (
        <div className="z-1 flex flex-row absolute overflow-x-clip hover:overflow-x-scroll w-[90%] h-[52px] mr-0 hover:bg-orange-300">
          {value.map((val, index: number) => {
            return (
              <div key={index} >
                <div className=" float-right">
                  <button onClick={(event) => deleteFile(event, val, index)}> <TiDelete className={theme === "dark-theme" ? "fill-slate-200 hover:fill-slate-300" : "fill-gray-800 hover:fill-gray-500"}> </TiDelete> </button>
                </div>
                <a className="ml-1" key={index} href={val} target='_blank'>{text.concat('-', index.toString())} </a>
              </div>
            )
          })}
        </div>
      )
    }
  }, [deleteFile, getTextInstructors, getValue, theme])

  return (
    <div>
      {getLinks() !== "" ? (
        getLinks()
      ) : (
        <GoogleDriverPicker {...props} />
      )}
    </div>
  );
};