import Redirect from "@/components/Auth/Components/Redirect"
import { ThemeContext } from "@/context/Theme/Theme"
import { useContext } from "react"
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap"
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc"

const ToolBar = (onClearFilterButtonClick, setColumnWindowOpen, onAddRowToolBarClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, checkedAmount, onFilterTextBoxChanged, onDisplayProgramsClicked, LoadingOverlay) => {
  const { theme } = useContext(ThemeContext)

  return (
    <div className="d-flex align-items-center flex-row-reverse gap-2">
      <LoadingOverlay />
      <Redirect type={"Contacts"} ScopeType={"Contacts"} />
      
      <OverlayTrigger
        placement={"top"}
        overlay={<Tooltip className="absolute">בטל סינון</Tooltip>}
      >
        <button
          className="hover:bg-[#253d37] rounded p-1"
          onClick={onClearFilterButtonClick}
        >
          <FcCancel className="w-[37px] h-[37px]" />
        </button>
      </OverlayTrigger>

      <OverlayTrigger
        placement={"top"}
        overlay={<Tooltip className="absolute" id="tooltip-bottom">ניהול עמודות</Tooltip>}
      >
        <button
          className="hover:bg-[#253d37] rounded p-1"
          onClick={() => setColumnWindowOpen(true)}
        >
          <FcAddColumn className="w-[37px] h-[37px]" />
        </button>
      </OverlayTrigger>
      
      <OverlayTrigger
        placement={"top"}
        overlay={<Tooltip className="absolute" id="tooltip-bottom">הוסף שורה</Tooltip>}
      >
        <button
          className="hover:bg-[#253d37] rounded p-1"
          onClick={onAddRowToolBarClick}
        >
          <FcAddRow className="w-[37px] h-[37px]" />
        </button>
      </OverlayTrigger>

      <button
        id="cancelchangesbutton-school"
        onClick={onCancelChangeButtonClick}
        className="hover:bg-slate-500 bg-slate-600 rounded px-3 py-1 text-white border-solid hidden text-sm"
      >
        בטל שינויים
      </button>

      <button
        id="savechangesbutton-school"
        onClick={onSaveChangeButtonClick}
        className="hover:bg-rose-700 bg-rose-800 rounded px-3 py-1 text-white border-solid hidden text-sm"
      >
        שמור שינויים{" "}
      </button>

      <button
        id="savedeletions"
        onClick={onSaveDeletions}
        className="hover:bg-green-700 bg-green-800 rounded px-3 py-1 text-white border-solid hidden text-sm"
      >
        מחק {checkedAmount} שורות
      </button>

      <input
        className={theme === "dark-theme" ? "text-right bg-gray-900 text-white border-solid w-[200px] h-[35px] p-2 rounded" :
          "text-right bg-white text-gray-500 border-solid w-[200px] h-[35px] p-2 rounded"}
        type="text"
        id="filter-text-box"
        placeholder="חיפוש"
        onInput={onFilterTextBoxChanged}
      />

      {/* הכפתור המעודכן: שורה אחת, גודל רגיל, גובה מותאם לאייקונים */}
      <Button
        className="hover:bg-[#253d37] rounded mr-3 d-flex align-items-center justify-content-center px-3 border-0 shadow-none"
        onClick={onDisplayProgramsClicked}
        style={{ height: '37px', whiteSpace: 'nowrap' }} 
      >
        הצג תוכניות
      </Button>
    </div>
  )
}

export default ToolBar