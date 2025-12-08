import { getProgramWithId } from "@/db/programsRequests";
import { Guide, Program } from "@prisma/client";
import { ICellEditorParams, ICellRendererParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { MdInsertLink } from "react-icons/md";

interface NamePhoneCellEditor extends ICellEditorParams<Guide> {
    AllGuides: Guide[]

}


export const NamePhoneCellEditor = forwardRef(({ AllGuides, ...props }: NamePhoneCellEditor, ref: any) => {
    const [CellPhone, setCellPhone] = useState<string>(props.data.CellPhone)
    const [Name, setName] = useState<string>(props.data?.FirstName)

    const inputRefName = useRef<HTMLInputElement>(null);
    const inputRefPhone = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const getData = async () => {

            const guide: Guide = AllGuides.find((guide) => guide.Guideid === props.data.Guideid)

            if (guide) {
                setCellPhone(guide?.CellPhone)
                setName(guide?.FirstName)

            }

        }
        getData()

        return () => {


        }

    }, [AllGuides, props, Name, CellPhone])

    const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault() // make it not do html post request.

        props.node.setDataValue("FirstName", inputRefName.current.value);
        props.node.setDataValue("CellPhone", inputRefPhone.current.value)

        props.api.stopEditing()

    }, [props.node, props.api])


    const onInvalid = useCallback((event: React.FormEvent<HTMLInputElement>, name: string) => {
        if (event.currentTarget) {
            if (name === "Name") {
                event.currentTarget.setCustomValidity("חסר שם")
            }
            else {
                event.currentTarget.setCustomValidity("חסר טלפון")
            }
        }


    }, [])
    const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, name: string) => {
        if (name === "Name") {
            setName(event.target.value)
        }
        else {
            setCellPhone(event.target.value)
        }
    }, [])

    const getCell = useCallback(() => {
        return (
            <form className="max-w-sm mx-auto overflow-visible absolute bg-white w-[300px]" onSubmit={onSubmit} >
                <div className="mb-5">
                    <label htmlFor="Name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם פרטי</label>
                    <input ref={inputRefName} onChange={(event) => onChange(event, "Name")} onInvalid={(event) => onInvalid(event, "Name")} type="Name" defaultValue={Name} id="ProgramName" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
                </div>
                <div className="mb-5">

                    <label htmlFor="CellPhone" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">טלפון</label>
                    <input ref={inputRefPhone} onChange={(event) => onChange(event, "CellPhone")} onInvalid={(event) => onInvalid(event, "CellPhone")} defaultValue={CellPhone} type="CellPhone" id="CellPhone" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="טלפון" required />
                </div>
                <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">שמור</button>
            </form>

        )


    }, [CellPhone, Name, onChange, onInvalid, onSubmit])

    return getCell()

})

NamePhoneCellEditor.displayName = "NamePhoneCellEditor"