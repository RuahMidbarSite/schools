import { Assigned_Guide, Guide, Program } from "@prisma/client"
import { ICellRendererParams } from "ag-grid-community"
import { useCallback, useEffect, useState } from "react"

interface customAssignedGuidesColumn extends ICellRendererParams<Program> {
  assigned_guides: Assigned_Guide[]
  guides: Guide[]
}

const AssignedGuidesColumn = (props: customAssignedGuidesColumn) => {

  const [CurrentProgramID, _] = useState<number>(props.data.Programid)
  const [Guides, setGuides] = useState<Guide[]>(null)

  useEffect(() => {
    const Res = () => {
      const assigned_guides_ids: number[] =
        props.assigned_guides?.filter((val) => val.Programid === CurrentProgramID).map((val) => val.Guideid)
      const guide_details: Guide[] = props.guides?.filter((val) => assigned_guides_ids.includes(val.Guideid))
      if (guide_details.length > 0) {
        setGuides(guide_details)
      }
    }
    Res()
  }, [CurrentProgramID, props.assigned_guides, props.guides])


  const getShownText = useCallback(() => {
    if (Guides) {
      const phone_links = Guides.map((val) => `whatsapp://send/?phone=972${val.CellPhone}`)
      
      // *** התיקון כאן: לוגיקה חכמה לשמות למניעת כפילויות ***
      const names = Guides.map((val) => {
          const fName = val.FirstName?.trim() || "";
          const lName = val.LastName?.trim() || "";

          // אם אין שם בכלל
          if (!fName && !lName) return "שם לא ידוע";
          
          // אם שם המשפחה כבר מתחיל בשם הפרטי (למשל: לירז, לירז פרידמן) -> נחזיר רק את המשפחה
          if (lName.startsWith(fName)) {
              return lName;
          }

          // אחרת, נחבר אותם רגיל
          if (fName && lName) {
              return `${fName} ${lName}`;
          }

          // אם יש רק אחד מהם
          return fName || lName;
      });

      return Guides.map((val, index) =>
        <a href={phone_links[index]} className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline" key={val.Guideid}>
          {names[index]}   {index < Guides.length - 1 && ", "}
        </a>
      )
    }
  }, [Guides])

  return (
    <div>
      {getShownText()}
    </div>
  )
}

export default AssignedGuidesColumn