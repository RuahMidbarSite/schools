import { Assigned_Guide, Guide, Program } from "@prisma/client"
import { ICellRendererParams } from "ag-grid-community"
import { useCallback, useEffect, useState } from "react"

interface customAssignedGuidesColumn extends ICellRendererParams<Program> {
  assigned_guides: Assigned_Guide[] 
  guides: Guide[]
}

const AssignedGuidesColumn = (props: customAssignedGuidesColumn) => {
  const [Guides, setGuides] = useState<Guide[] | null>(null)

  useEffect(() => {
    // הגנה: אם אין נתונים, אין מה לעשות
    if (!props.assigned_guides || !props.guides || !props.data) return;

    const Res = () => {
      // שלב א: מציאת המזהים של המדריכים. 
      // שימו לב לשימוש ב- == (פעמיים שווה) ולא ===, כדי למנוע בעיות של טקסט מול מספר
      // ושימוש ישיר ב-props.data.Programid כדי למנוע בעיות ריענון
      const assigned_guides_ids: number[] = props.assigned_guides
          .filter((val) => val.Programid == props.data.Programid)
          .map((val) => val.Guideid)
      
      // שלב ב: מציאת פרטי המדריכים
      const guide_details: Guide[] = props.guides.filter((val) => assigned_guides_ids.includes(val.Guideid))
      
      if (guide_details.length > 0) {
        setGuides(guide_details)
      } else {
        setGuides(null)
      }
    }
    Res()
  }, [props.data.Programid, props.assigned_guides, props.guides])

  const getShownText = useCallback(() => {
    if (Guides && Guides.length > 0) {
      const phone_links = Guides.map((val) => `whatsapp://send/?phone=972${val.CellPhone}`)
      
      const names = Guides.map((val) => {
          const fName = val.FirstName?.trim() || "";
          const lName = val.LastName?.trim() || "";
          
          if (!fName && !lName) return "לא ידוע";
          if (lName.startsWith(fName)) return lName;
          if (fName && lName) return `${fName} ${lName}`;
          return fName || lName;
      });

      return Guides.map((val, index) =>
        <a href={phone_links[index]} className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline" key={val.Guideid}>
          {names[index]} {index < Guides.length - 1 && ", "}
        </a>
      )
    }
    return null;
  }, [Guides])

  return (
    <div>
      {getShownText()}
    </div>
  )
}

export default AssignedGuidesColumn