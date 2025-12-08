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
        setLink(program.ProgramLink)
        setProgramName(program.ProgramName)
        // set value for customfilter to work.
        props.setValue(program.ProgramName)
      }
    }, [props])

    useEffect(() => {
      const GetOrSetData = async () => {
        const program = AllPrograms?.find((program) => program.Programid === props.data.Programid)
        if (program?.ProgramName && program?.ProgramLink) {
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
      if (Link !== '' && ProgramName !== '') {
        return (
          <a
            href={Link}
            target="_blank"
            className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
          > {ProgramName} </a>

        )
      }
      return ""
    }, [Link, ProgramName])

    return getCell()




  })

ProgramLinkDetailsCellRenderer.displayName = "ProgramDescription"
