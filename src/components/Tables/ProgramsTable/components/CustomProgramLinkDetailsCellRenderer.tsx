import { getProgramWithId, updateProgramsColumn } from "@/db/programsRequests";
import { Program } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";


interface ProgramDetails extends ICellRendererParams<Program> {
  AllPrograms: Program[]
}

export interface RefFunctions {
  refresh: (arg: ProgramDetails) => void,
  updateProgram: (programs: Program) => void
}

export const ProgramLinkDetailsCellRenderer = forwardRef<RefFunctions, ProgramDetails>(
  ({ AllPrograms, ...props }, ref) => {

    const [Programs, setAllPrograms] = useState(AllPrograms)
    const [Link, setLink] = useState(props.data.ProgramLink)
    const [ProgramName, setProgramName] = useState(props.data.ProgramName)
    const [currentProgram, setCurrentProgram] = useState<Program>()
    
    const updateProgram = useCallback((program: Program) => {
      if (program) {
        setCurrentProgram(program)
        // הנתונים האלה מגיעים מ-event.data שהעורך עדכן
        setLink(program.ProgramLink)
        setProgramName(program.ProgramName) 
        // set value for customfilter to work.
        props.setValue(program.ProgramName)
      }
    }, [props])

    useEffect(() => {
      const GetOrSetData = async () => {
        const program = AllPrograms?.find((program) => program.Programid === props.data.Programid)
        if (program?.ProgramName) {
          // נשתמש בנתונים הקיימים, גם אם הלינק חסר
          setLink(program.ProgramLink)
          setProgramName(program.ProgramName)
          // set value for customfilter to work.
          props.setValue(program.ProgramName)
        }

      }
      GetOrSetData()

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Programs,AllPrograms])

    const refresh = (props: ProgramDetails) => {
      return true
    }
  
    useImperativeHandle(
      ref,
      (): RefFunctions => {
        return {
          refresh: refresh,
          updateProgram: updateProgram
        }

      },
      [],
    )

    const getCell = useCallback(() => {
      // אם יש שם תוכנית, אנחנו מציגים אותו בכל מקרה
      if (ProgramName) {
        // אם יש גם לינק, נציג אותו כקישור פעיל
        if (Link) {
          return (
            <a
              href={Link}
              target="_blank"
              className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
            > {ProgramName} </a>
  
          )
        }
        // אם אין לינק, נציג רק את שם התוכנית כטקסט רגיל
        return ProgramName;

      }
      // אם אין שם תוכנית בכלל, נחזיר ריק
      return "";

    }, [Link, ProgramName])

    return getCell()

  })

ProgramLinkDetailsCellRenderer.displayName = "ProgramDescription"