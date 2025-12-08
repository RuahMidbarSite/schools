import { ThemeContext } from "@/context/Theme/Theme"
import { useContext } from "react"
import { Button, Navbar, OverlayTrigger, Tooltip } from "react-bootstrap"
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc"




const ToolBar = (onClearFilterButtonClick,setColumnWindowOpen,onAddRowToolBarClick,onCancelChangeButtonClick,onSaveChangeButtonClick,onSaveDeletions,checkedAmount,onFilterTextBoxChanged) => {
   const { theme } = useContext(ThemeContext)
  
  return (

     <Navbar
        id="ContactNavBar"
        className="bg-[#12242E] fill-[#ffffff] opacity-[1.40e+7%]"

        style={{ flexDirection: 'row-reverse' }}
      >
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
          overlay={<Tooltip className="absolute">ניהול עמודות</Tooltip>}
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
          overlay={<Tooltip className="absolute">הוסף שורה</Tooltip>}
        >
          <button
            className="hover:bg-[#253d37]  rounded mr-1 ml-1"
            onClick={onAddRowToolBarClick}
          >
            <FcAddRow className="w-[37px] h-[37px]" />
          </button>
        </OverlayTrigger>

        <button
          id="cancelchangesbutton-contacts"
          onClick={onCancelChangeButtonClick}
          className="hover:bg-slate-500 bg-slate-600 rounded ml-[50px] text-white border-solid hidden "
        >
          בטל שינויים
        </button>

        <button
          id="savechangesbutton-contacts"
          onClick={onSaveChangeButtonClick}
          className="hover:bg-rose-700 bg-rose-800 rounded ml-[50px] text-white  border-solid hidden "
        >
          שמור שינויים{" "}
        </button>

        <button
          id="savedeletions"
          onClick={onSaveDeletions}
          className="hover:bg-green-700 bg-green-800 rounded  text-white  border-solid hidden  "
        >
          מחק {checkedAmount} שורות
        </button>

        <input
         className={theme==="dark-theme"?"text-right  bg-gray-900 text-white  border-solid w-[200px] h-[40px] p-2 mr-1":
                                      "text-right  bg-white text-gray-500  border-solid w-[200px] h-[40px] p-2 mr-1"}
          type="text"
          id="filter-text-box"
          placeholder="חיפוש"
          onInput={onFilterTextBoxChanged}
        />
      </Navbar>

)
  

}

export default ToolBar