import Redirect from "@/components/Auth/Components/Redirect"
import { ThemeContext } from "@/context/Theme/Theme"
import { useContext } from "react"
import { Button, Navbar, OverlayTrigger, Tooltip } from "react-bootstrap"
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc"




const ToolBar = (onClearFilterButtonClick,setColumnWindowOpen,onAddRowToolBarClick,onCancelChangeButtonClick,onSaveChangeButtonClick,onSaveDeletions,checkedAmount,onFilterTextBoxChanged,DeleteCheckedAmountText,SchoolID,isLoading,LoadingOverlay) => {
const { theme } = useContext(ThemeContext)
const name_cancel = "cancelchangesbutton-minicontacts".concat(' ',SchoolID)
const name_save = "savechangesbutton-minicontacts".concat(' ',SchoolID)
const name_delete = "savedeletions-mini".concat(' ',SchoolID)

// חישוב הצבע בזמן אמת בכל פעם שהפונקציה רצה
const isDark = theme === "dark-theme"
const navbarBg = isDark 
  ? 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
  : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)'

  return (

      <Navbar
        id={"ContactNavBar".concat(' ',SchoolID)}
        className="w-screen"
        style={{
          background: navbarBg,
          minHeight: '64px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid rgba(71, 85, 105, 0.5)'
        }}
      > 
        <LoadingOverlay/>
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
          overlay={<Tooltip className="absolute" >הוסף שורה</Tooltip>}
        >
          <button
            className="hover:bg-[#253d37]  rounded mr-1 ml-1"
            onClick={onAddRowToolBarClick}
          >
            <FcAddRow className="w-[37px] h-[37px]" />
          </button>
        </OverlayTrigger>

        <button
          id={name_cancel}
           onClick={onCancelChangeButtonClick}
          className="hover:bg-slate-500 bg-slate-600 rounded ml-[50px] text-white border-solid hidden "
        >
          בטל שינויים
        </button>

        <button
          id={name_save}
          onClick={onSaveChangeButtonClick}
          className="hover:bg-rose-700 bg-rose-800 rounded ml-[50px] text-white  border-solid hidden "
        >
          שמור שינויים{" "}
        </button>

        <button
          id={name_delete}
           onClick={onSaveDeletions}
          className="hover:bg-green-700 bg-green-800 rounded  text-white  border-solid hidden  "
        >
                    מחק {checkedAmount} שורות
        </button>

        <input
           className={theme==="dark-theme"?"text-right  bg-gray-900 text-white  border-solid w-[200px] h-[40px] p-2 mr-1":
                                      "text-right  bg-white text-gray-500  border-solid w-[200px] h-[40px] p-2 mr-1"}
          type="text"
          id={`filter-text-box-mini`.concat(' ',SchoolID)}
          placeholder="חיפוש"
          onInput={onFilterTextBoxChanged}
        />
      </Navbar>

)
  

}

export default ToolBar