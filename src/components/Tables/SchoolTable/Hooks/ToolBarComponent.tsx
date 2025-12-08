import Redirect from "@/components/Auth/Components/Redirect"
import { ThemeContext } from "@/context/Theme/Theme"
import { useContext } from "react"
import { Button, Navbar, OverlayTrigger, Tooltip } from "react-bootstrap"
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc"




const ToolBar = (onClearFilterButtonClick, setColumnWindowOpen, onAddRowToolBarClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, checkedAmount, onFilterTextBoxChanged, onDisplayProgramsClicked,LoadingOverlay) => {
  const { theme } = useContext(ThemeContext)

  return (

    <Navbar
      id="SchoolNavBar"
      className="bg-[#12242E] fill-[#ffffff] opacity-[1.40e+7%]  flex-row-reverse"
    >
     <LoadingOverlay/>
      <Redirect type={"Contacts"} ScopeType={"Contacts"} />
      <OverlayTrigger
        placement={"top"}
        overlay={<Tooltip className="absolute">בטל סינון</Tooltip>}
      >
        <button
          className="hover:bg-[#253d37] rounded mr-1 ml-1"
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
          className="hover:bg-[#253d37] rounded mr-1 ml-1"
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
          className="hover:bg-[#253d37] rounded mr-1 ml-1"
          onClick={onAddRowToolBarClick}
        >
          <FcAddRow className="w-[37px] h-[37px]" />
        </button>
      </OverlayTrigger>

      <button
        id="cancelchangesbutton-school"
        onClick={onCancelChangeButtonClick}
        className="hover:bg-slate-500 bg-slate-600 rounded mr-[100px] text-white border-solid hidden"
      >
        בטל שינויים
      </button>

      <button
        id="savechangesbutton-school"
        onClick={onSaveChangeButtonClick}
        className="hover:bg-rose-700 bg-rose-800 rounded mr-[50px] text-white border-solid hidden"
      >
        שמור שינויים{" "}
      </button>

      <button
        id="savedeletions"
        onClick={onSaveDeletions}
        className="hover:bg-green-700 bg-green-800 rounded mr-[50px] text-white  border-solid hidden  "
      >
        מחק {checkedAmount} שורות
      </button>

      <input
        className={theme === "dark-theme" ? "text-right  bg-gray-900 text-white  border-solid w-[200px] h-[40px] p-2 mr-1" :
          "text-right  bg-white text-gray-500  border-solid w-[200px] h-[40px] p-2 mr-1"}
        type="text"
        id="filter-text-box"
        placeholder="חיפוש"
        onInput={onFilterTextBoxChanged}
      />

      <Button
        className="hover:bg-[#253d37] rounded mr-3"
        onClick={onDisplayProgramsClicked}
      >
        הצג תוכניות
      </Button>
    </Navbar>

  )








}

export default ToolBar