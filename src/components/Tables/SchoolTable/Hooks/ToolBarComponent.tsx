import Redirect from "@/components/Auth/Components/Redirect"
import { GoogleDriveAuthStatus } from "@/components/GoogleDriveAuthStatus"
import { ThemeContext } from "@/context/Theme/Theme"
import { useContext } from "react"
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap"
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc"

const ToolBar = (
  onClearFilterButtonClick, 
  setColumnWindowOpen, 
  onAddRowToolBarClick, 
  onCancelChangeButtonClick, 
  onSaveChangeButtonClick, 
  onSaveDeletions, 
  checkedAmount, 
  onFilterTextBoxChanged, 
  onDisplayProgramsClicked, 
  LoadingOverlay,
  checkContactsStatus,
  onDisconnectContacts,
  schoolStatuses = [],         // הוספנו (עם ערך דיפולט למניעת קריסות)
  activeStatusFilter = null,   // הוספנו
  handleStatusFilter = () => {}, // הוספנו
  statusCounts = {},           // הוספנו - אובייקט ספירת הסטטוסים
  handleBatchStatusUpdate = (status) => {} // תוספת: פונקציית עדכון גורף
) => {
  const { theme } = useContext(ThemeContext)

  return (
<div 
  className="d-flex align-items-start justify-content-between gap-2 px-4 py-2" // שינוי ל-align-items-start
  style={{
    width: '100%',
    minHeight: '80px',
    background: 'transparent'
  }}
>   
      {/* 👈 צד שמאל - סטטוס Google Contacts וכפתור תוכניות */}
      <div className="d-flex flex-column align-items-center gap-2">
        <div className="bg-blue-100 px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
          <GoogleDriveAuthStatus
            type="Contacts"
            checkAuthStatus={checkContactsStatus}
            onDisconnect={onDisconnectContacts}
          />
        </div>
        <Button
          className="hover:bg-blue-700 bg-blue-600 rounded d-flex align-items-center justify-content-center px-3 border-0 shadow-sm text-white text-sm"
          onClick={onDisplayProgramsClicked}
          style={{ height: '32px', width: '100%', whiteSpace: 'nowrap' }} 
        >
          הצג תוכניות
        </Button>
      </div>

      {/* 👉 צד ימין - כל הכפתורים */}
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

        {/* תוספת: תפריט בחירת סטטוס להחלפה גורפת - מופיע רק כשיש שורות מסומנות */}
        {checkedAmount > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleBatchStatusUpdate(e.target.value);
                e.target.value = ""; // איפוס הבחירה לאחר מכן כדי לאפשר בחירה חוזרת
              }
            }}
            className={theme === "dark-theme" 
              ? "bg-teal-700 text-white border-solid h-[35px] px-2 rounded text-sm cursor-pointer outline-none font-semibold shadow-sm transition-all hover:bg-teal-600" 
              : "bg-teal-600 text-white border-solid h-[35px] px-2 rounded text-sm cursor-pointer outline-none font-semibold shadow-sm transition-all hover:bg-teal-700"}
            style={{ direction: 'rtl' }}
            defaultValue=""
          >
            <option value="" hidden>שנה סטטוס ל-{checkedAmount} רשומות</option>
            {schoolStatuses.map((status) => (
              <option key={status.StatusId} value={status.StatusName}>
                {status.StatusName}
              </option>
            ))}
          </select>
        )}

        <input
          className={theme === "dark-theme" ? "text-right bg-gray-900 text-white border-solid w-[200px] h-[35px] p-2 rounded" :
            "text-right bg-white text-gray-500 border-solid w-[200px] h-[35px] p-2 rounded"}
          type="text"
          id="filter-text-box"
          placeholder="חיפוש"
          onInput={onFilterTextBoxChanged}
        />
        {/* --- התחלת תוספת כפתורי הסטטוסים --- */}
        {schoolStatuses.length > 0 && (
          <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0, paddingRight: '15px' }} dir="rtl">
            <div style={{ width: '1px', height: '40px', backgroundColor: '#cbd5e1', marginLeft: '12px', flexShrink: 0 }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* שורה ראשונה - ספירה מעל הכפתור */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}>
                {schoolStatuses.slice(0, Math.ceil(schoolStatuses.length / 2)).map((status: any) => (
                  <div key={status.StatusId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', lineHeight: '1', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>
                      {statusCounts[status.StatusName] || 0}
                    </span>
                    <button
                      onClick={() => handleStatusFilter(status.StatusName)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all border shadow-sm ${
                        activeStatusFilter === status.StatusName
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      style={{ whiteSpace: 'nowrap', height: '28px' }}
                    >
                      {status.StatusName}
                    </button>
                  </div>
                ))}
              </div>

              {/* שורה שנייה - ספירה מתחת לכפתור */}
              {schoolStatuses.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}>
                  {schoolStatuses.slice(Math.ceil(schoolStatuses.length / 2)).map((status: any) => (
                    <div key={status.StatusId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <button
                        onClick={() => handleStatusFilter(status.StatusName)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all border shadow-sm ${
                          activeStatusFilter === status.StatusName
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                        style={{ whiteSpace: 'nowrap', height: '28px' }}
                      >
                        {status.StatusName}
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', lineHeight: '1', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>
                        {statusCounts[status.StatusName] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* --- סוף תוספת כפתורי הסטטוסים --- */}

      </div>
    </div>
  )
}

export default ToolBar