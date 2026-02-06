import { sendMessageViaWhatsApp } from "@/db/whatsapprequests"
import { updateProgramMsg } from "@/db/instructorsrequest"
import { Guide, Program } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useState, useEffect } from "react"
// ייבוא פונקציות ה-Storage כדי לסנכרן את הנתונים לאחר השמירה
import { getFromStorage, updateStorage } from "@/components/Tables/PlacementTable/Storage/PlacementDataStorage";

type Data = {
  Inner_SelectedRows: Guide[] | undefined,
  LeftGridApi: GridApi<Guide> | null,
  currentProgramData?: Program 
}

const SendMessagesBox = ({ Inner_SelectedRows, LeftGridApi, currentProgramData }: Data) => {
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false) // אינדיקציה למצב שליחה

  // טעינת הנוסח מה-DB ברגע שבוחרים תוכנית
  useEffect(() => {
    if (currentProgramData) {
      setInputValue(currentProgramData.msg || "");
    } else {
      setInputValue("");
    }
  }, [currentProgramData]);

  // פונקציית שליחה הכוללת בדיקת חיבור ל-WhatsApp והתאמה אישית של השם
  const onClickSend = useCallback(async () => {
    if (!Inner_SelectedRows || Inner_SelectedRows.length === 0) {
      alert("לא נבחרו מדריכים למשלוח");
      return;
    }

    // 1. בדיקת חיבור ל-WhatsApp מול השרת (בדיוק כמו בדף ההודעות)
    try {
      const statusRes = await fetch('http://localhost:3994/status');
      const statusData = await statusRes.json();
      
      if (!statusData.connected) {
        alert("נדרש חיבור ל-WhatsApp! אנא וודא שהכפתור בסרגל העליון ירוק (סרוק QR במידת הצורך).");
        return;
      }
    } catch (err) {
      alert("שגיאה בתקשורת עם שרת ה-WhatsApp. וודא שהוא פועל.");
      return;
    }

    setIsSending(true);
    const promises = []
    
    for (const guide of Inner_SelectedRows) {
      const phone: string = guide.CellPhone || ""
      if (phone) {
        // 2. התאמה אישית: החלפת {name} בשם הפרטי של המדריך
        const personalizedMsg = inputValue.replace(/{name}/g, guide.FirstName || "");
        
        promises.push(sendMessageViaWhatsApp(personalizedMsg, undefined, undefined, phone, "972", undefined))
      }
    }
    
    try {
      await Promise.all(promises);
      alert("ההודעות המותאמות אישית נשלחו בהצלחה");
      if (LeftGridApi) LeftGridApi.deselectAll();
    } catch (err) {
      console.error("שגיאה בתהליך השליחה:", err);
      alert("חלק מההודעות לא נשלחו. בדוק את חיבור הווצאפ.");
    } finally {
      setIsSending(false);
    }
  }, [Inner_SelectedRows, LeftGridApi, inputValue]);

  // פונקציית שמירה המעדכנת גם את ה-DB וגם את ה-Storage המקומי
  const onSaveMsg = useCallback(async () => {
    if (!currentProgramData?.Programid) {
      alert("לא ניתן לשמור: לא נבחרה תוכנית");
      return;
    }

    setIsSaving(true);
    try {
      // 1. עדכון בבסיס הנתונים
      await updateProgramMsg(currentProgramData.Programid, inputValue);

      // 2. עדכון ה-Storage המקומי (פותר את בעיית הרענון)
      const currentCache = await getFromStorage();
      if (currentCache && currentCache.Programs) {
        const updatedPrograms = currentCache.Programs.map((p: any) => 
          p.Programid === currentProgramData.Programid ? { ...p, msg: inputValue } : p
        );
        
        await updateStorage({ 
          ...currentCache, 
          Programs: updatedPrograms 
        });
      }

      alert("✅ הנוסח נשמר בהצלחה בבסיס הנתונים ובמטמון המקומי");
    } catch (error) {
      console.error("שגיאה בשמירה:", error);
      alert("נכשלה שמירת הנוסח.");
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
        placeholder="רשום הודעה לשמירה. השתמש ב-{name} לשם פרטי..."
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
          disabled={isSending} // נטרול הכפתור בזמן שליחה
          style={{ flex: 1, opacity: isSending ? 0.7 : 1 }}
        >
          {isSending ? "שולח..." : "שלח הודעה"}
        </button>
      </div>
    </div>
  )
}

export default SendMessagesBox;