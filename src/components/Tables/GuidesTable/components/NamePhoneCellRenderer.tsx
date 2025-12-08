import { getProgramWithId, updateProgramsColumn } from "@/db/programsRequests";
import { Guide, Program } from "@prisma/client";
import { ICellEditorParams, ICellRendererParams } from "ag-grid-community";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";


interface NamePhoneCellRenderer extends ICellRendererParams<Guide> {
    AllGuides: Guide[]

}

export interface RefFunctions {
    refresh: (arg: NamePhoneCellRenderer) => void,
    updateGuide: (Guide: Guide) => void
}

export const NamePhoneCellRenderer = forwardRef<RefFunctions, NamePhoneCellRenderer>(
    ({ AllGuides, ...props }, ref) => {

        const [currentGuide, setCurrentGuide] = useState(undefined)
        const [CellPhone, setCellPhone] = useState<string>(props.data.CellPhone)
        const [Name, setName] = useState<string>(props.data.FirstName)


        const Link = useMemo(() => {
            const formattedPhone = currentGuide?.CellPhone?.replace('+972', '').replace(/[-\s]/g, '');
            const link = `whatsapp://send/?phone=972${formattedPhone}`;
            return link
        }, [currentGuide])



        const updateGuide = useCallback((guide: Guide) => {
            if (guide) {
                setCellPhone(guide.CellPhone)
                setName(guide.FirstName)

                setCurrentGuide(guide)
                // set value for customfilter to work.
                props.setValue(guide.FirstName)
            }
        }, [props])
        useEffect(() => {
            const guide: Guide = AllGuides?.find((guide) => guide.Guideid === props.data.Guideid)
            updateGuide(guide)

        }, [AllGuides, props.data.Guideid, props, updateGuide])


        const refresh = (props: NamePhoneCellRenderer) => {
            return true
        }

        useImperativeHandle(
            ref,
            (): RefFunctions => {
                return {
                    refresh: refresh,
                    updateGuide: updateGuide
                }

            },
            [],
        )

        const getCell = useCallback(() => {
            if (Name !== '' && CellPhone !== '') {

                return (
                    <a
                        href={Link}
                        target="_blank"
                        className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
                    > {Name} </a>

                )
            }
            return ""
        }, [CellPhone, Link, Name])

        return getCell()




    })

NamePhoneCellRenderer.displayName = "ProgramDescription"
