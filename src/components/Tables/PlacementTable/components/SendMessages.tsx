import { sendMessageViaWhatsApp } from "@/db/whatsapprequests"
import { updateProgramMsg } from "@/db/instructorsrequest"
import { Guide, Program } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useState, useEffect } from "react"

type Data = {
  Inner_SelectedRows: Guide[] | undefined,
  LeftGridApi: GridApi<Guide> | null,
  currentProgramData?: Program 
}

const SendMessagesBox = ({ Inner_SelectedRows, LeftGridApi, currentProgramData }: Data) => {
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)

 useEffect(() => {
    if (currentProgramData) {
      // כעת השדה msg אמור להיות מזוהה בזכות ה-generate המוצלח
      setInputValue(currentProgramData.msg || "");
      console.log("📥 נטען נוסח עבור תוכנית:", currentProgramData.Programid);
    } else {
      setInputValue("");
    }
  }, [currentProgramData]);

  const onClickSend = useCallback(() => {
    const promises = []
    if (Inner_SelectedRows && Inner_SelectedRows.length > 0) {
      for (const guide of Inner_SelectedRows) {
        const phone: string = guide.CellPhone || ""
        if (phone) {
          promises.push(sendMessageViaWhatsApp(inputValue, undefined, undefined, phone, "972", undefined))
        }
      }
      
      Promise.all(promises).then((results) => {
        alert("ההודעות נשלחו בהצלחה");
        if (LeftGridApi) LeftGridApi.deselectAll();
      }).catch(err => console.error("שגיאה בשליחה:", err));
    } else {
      alert("לא נבחרו מדריכים למשלוח");
    }
  }, [Inner_SelectedRows, LeftGridApi, inputValue])

  const onSaveMsg = useCallback(async () => {
    // בדיקה קריטית: האם התוכנית עברה לקומפוננטה
    if (!currentProgramData?.Programid) {
      console.error("❌ שגיאה: currentProgramData חסר או לא מכיל Programid");
      alert("לא ניתן לשמור: לא נבחרה תוכנית או שהנתונים לא עברו כראוי");
      return;
    }

    setIsSaving(true);
    try {
      console.log(`💾 מנסה לשמור נוסח לתוכנית ${currentProgramData.Programid}...`);
      await updateProgramMsg(currentProgramData.Programid, inputValue);
      alert("✅ הנוסח נשמר בהצלחה במסד הנתונים");
    } catch (error) {
      console.error("❌ שגיאה בשמירת הנוסח:", error);
      alert("נכשלה שמירת הנוסח. וודא שהוספת את שדה msg ל-Schema והרצת generate");
    } finally {
      setIsSaving(false);
    }
  }, [currentProgramData, inputValue]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      height: '100%',
      gap: '12px',
      direction: 'rtl'
    }}>
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="רשום הודעה לשמירה כשבלונה..."
        style={{
          flex: 1,
          width: '100%',
          resize: 'none',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          outline: 'none',
          fontFamily: 'inherit'
        }}
      />

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded border-b-4 border-green-800"
          onClick={onSaveMsg}
          disabled={isSaving}
          style={{ flex: 1, opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? "שומר..." : "שמירת נוסח"}
        </button>

        <button
          className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded border-b-4 border-blue-700"
          onClick={onClickSend}
          style={{ flex: 1 }}
        >
          שלח הודעה
        </button>
      </div>
    </div>
  )
}

export default SendMessagesBox;