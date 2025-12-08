import { getProgramWithId } from "@/db/programsRequests";
import { Program } from "@prisma/client";
import { ICellEditorParams, ICellRendererParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { MdInsertLink } from "react-icons/md";



// eslint-disable-next-line react/display-name
export const ProgramLinkDetailsCellEditor = forwardRef((props: ICellEditorParams<Program>, ref: any) => {
  const [Link, setLink] = useState<string>("")
  const [ProgramName, setProgramName] = useState<string>("")
  const [Confirm, setConfirm] = useState(false)
  useEffect(() => {
    const getData = async () => {

      const program: Program = await getProgramWithId(props.data.Programid)
      if (program && program.ProgramName && program.ProgramLink) {
        setLink(program.ProgramLink)
        setProgramName(program.ProgramName)
        // set value for customfilter to work.
        props.node?.setDataValue(props.column.getColId(), program.ProgramName)
        //props.api.refreshCells({rowNodes:[props.node]})
        //  props?.setValue(program.ProgramName)
      }

    }
    getData()



  }, [props, props.data.Programid])

  const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault() // make it not do html post request.
    props.node.setDataValue("ProgramName", ProgramName);
    props.node.setDataValue("ProgramLink", Link)
    setConfirm(true)

  }, [Link, ProgramName, props.node])


  const onInvalid = useCallback((event: React.FormEvent<HTMLInputElement>, name: string) => {
    if (event.currentTarget) {
      if (name === "Name") {
        event.currentTarget.setCustomValidity("חסר שם")
      }
      else {
        event.currentTarget.setCustomValidity("חסר לינק")
      }
    }


  }, [])
  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, name: string) => {
    if (name === "Name") {
      setProgramName(event.target.value)
    }
    else {
      setLink(event.target.value)
    }
  }, [])
  const getCell = useCallback(() => {
    if (Link !== '' && ProgramName !== '' && Confirm) {
      return (
        <a
          href={Link}
          target="_blank"
          className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
        > {ProgramName} </a>

      )
    }
    else {
      return (
        <form className="max-w-sm mx-auto overflow-visible absolute bg-white w-[300px]" defaultValue={ProgramName} onSubmit={onSubmit} >
          <div className="mb-5">
            <label htmlFor="ProgramName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם תוכנית</label>
            <input onChange={(event) => onChange(event, "Name")} onInvalid={(event) => onInvalid(event, "Name")} type="ProgramName" defaultValue={ProgramName} id="ProgramName" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="ניו מדיה" required />
          </div>
          <div className="mb-5">

            <label htmlFor="DriveLink" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">לינק לתוכנית</label>
            <input onChange={(event) => onChange(event, "Link")} onInvalid={(event) => onInvalid(event, "Link")} defaultValue={Link} type="DriveLink" id="DriveLink" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
          </div>
          <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">שמור</button>
        </form>

      )

    }
  }, [Confirm, Link, ProgramName, onChange, onInvalid, onSubmit])

  return getCell()

})

