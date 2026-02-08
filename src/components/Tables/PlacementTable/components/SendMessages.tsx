"use client";

import { sendMessageViaWhatsApp } from "@/db/whatsapprequests";
import { Guide, Program, MessagePattern } from "@prisma/client";
import { GridApi } from "ag-grid-community";
import { useCallback, useState, useEffect } from "react";
import { getPatternsByContext, addPattern } from "@/db/generalrequests";
import { updateProgramMsg } from "@/db/instructorsrequest";
// 🔥 תיקון מספר 1: שימוש ב-PlacementDataStorage במקום MessagesDataStorage!
import { getFromStorage, updateStorage } from "@/components/Tables/PlacementTable/Storage/PlacementDataStorage";

import Select from "react-select";
import { Button, InputGroup, Form, ListGroup } from "react-bootstrap";

type Data = {
  Inner_SelectedRows: Guide[] | undefined,
  LeftGridApi: GridApi<Guide> | null,
  currentProgramData?: Program 
}

const SendMessagesBox = ({ Inner_SelectedRows, LeftGridApi, currentProgramData }: Data) => {
  const [isMounted, setIsMounted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [patterns, setPatterns] = useState<MessagePattern[]>([]);
  const [newPatternName, setNewPatternName] = useState("");
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  
  // 🔧 תיקון Hydration: וודא שהקומפוננטה נטענה בצד הלקוח
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // תפריט בחירת משתנים (Autocomplete)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const suggestions = [
    { label: "שם מדריך", value: "{FirstName}" },
    { label: "שם תוכנית", value: "{ProgramName}" },
    { label: "יישוב", value: "{CityName}" },
    { label: "מספר שבועות", value: "{Weeks}" },
    { label: "ימים", value: "{Days}" },
    { label: "שיעורים ביום", value: "{LessonsPerDay}" },
    { label: "תאריך התחלה", value: "{Date}" },
    { label: "שלב חינוך", value: "{EducationStage}" },
    { label: "שכבה", value: "{Grade}" },

  ];

  // 1. טעינת תבניות כלליות (Placement)
  useEffect(() => {
    if (!isMounted) return; // 🔧 לא לרוץ לפני hydration
    
    const loadPatterns = async () => {
      const data = await getPatternsByContext("Placement");
      setPatterns(data);
    };
    loadPatterns();
  }, [isMounted]);

  // 2. 🔥 תיקון מספר 2: טעינה מ-Storage במקום מ-currentProgramData
  useEffect(() => {
    if (!isMounted) return; // 🔧 לא לרוץ לפני hydration
    
    const loadMessageFromStorage = async () => {
      if (!currentProgramData?.Programid) {
        setInputValue("");
        setSelectedOption(null);
        return;
      }

      try {
        // טעינה ישירה מ-Storage כדי לקבל את הנתונים העדכניים
        const cache = await getFromStorage();
        const freshProgram = cache?.Programs?.find(
          (p: any) => p.Programid === currentProgramData.Programid
        );
        
        const msgValue = freshProgram?.msg || "";
        console.log(`✅ [Programid: ${currentProgramData.Programid}] נוסח נטען מ-Storage:`, msgValue ? msgValue.substring(0, 50) + "..." : "ריק");
        
        setInputValue(msgValue);
        
        // סנכרון ה-Select
        if (msgValue) {
          const matchingPattern = patterns.find(p => p.Message1 === msgValue);
          if (matchingPattern) {
            setSelectedOption({ value: matchingPattern.Message1, label: matchingPattern.Caption });
          } else {
            setSelectedOption(null);
          }
        } else {
          setSelectedOption(null);
        }
      } catch (e) {
        console.error("❌ שגיאה בטעינת נוסח:", e);
        // Fallback - אם Storage נכשל
        const msgValue = currentProgramData.msg || "";
        setInputValue(msgValue);
        setSelectedOption(null);
      }
    };
    
    loadMessageFromStorage();
  }, [currentProgramData?.Programid, patterns, isMounted]);

  // 3. שמירה אוטומטית בזמן הקלדה
  useEffect(() => {
    if (!isMounted) return; // 🔧 לא לרוץ לפני hydration
    
    const timer = setTimeout(async () => {
      if (!currentProgramData?.Programid) return;
      
      try {
        // בדיקה מול Storage (לא מול currentProgramData.msg!)
        const cache = await getFromStorage();
        const currentStoredMsg = cache?.Programs?.find(
          (p: any) => p.Programid === currentProgramData.Programid
        )?.msg || "";
        
        if (inputValue !== currentStoredMsg) {
          console.log(`💾 [Programid: ${currentProgramData.Programid}] שומר:`, inputValue.substring(0, 30) + "...");
          
          // עדכון DB
          await updateProgramMsg(currentProgramData.Programid, inputValue);
          
          // עדכון Storage
          if (cache?.Programs) {
            const updated = cache.Programs.map((p: any) => 
              p.Programid === currentProgramData.Programid ? { ...p, msg: inputValue } : p
            );
            await updateStorage({ ...cache, Programs: updated });
          }
        }
      } catch (e) {
        console.error("❌ Auto-save failed:", e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputValue, currentProgramData?.Programid, isMounted]);
  
  // 4. זיהוי הקלדת { לצורך הצגת הצעות
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setInputValue(value);
    setCursorPos(position);

    // עדכון ה-Select
    const matchingPattern = patterns.find(p => p.Message1 === value);
    setSelectedOption(matchingPattern ? { value: matchingPattern.Message1, label: matchingPattern.Caption } : null);

    if (value[position - 1] === "{") {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertSuggestion = (suggestionValue: string) => {
    const before = inputValue.substring(0, cursorPos - 1);
    const after = inputValue.substring(cursorPos);
    const newValue = before + suggestionValue + after;
    setInputValue(newValue);
    setShowSuggestions(false);
    
    const matchingPattern = patterns.find(p => p.Message1 === newValue);
    setSelectedOption(matchingPattern ? { value: matchingPattern.Message1, label: matchingPattern.Caption } : null);
  };

  // 5. מפענח המשתנים
  const parsePersonalizedMessage = (template: string, guide: Guide, program: Program) => {
    if (!template) return "";
    const replacements: Record<string, any> = {
      "{FirstName}": guide.FirstName || "",
      "{ProgramName}": program.ProgramName || "",
      "{EducationStage}": program.EducationStage || "",
      "{CityName}": program.CityName || "",
      "{Weeks}": program.Weeks || "",
      "{Days}": program.Days || "",
      "{LessonsPerDay}": program.LessonsPerDay || "",
      "{Date}": program.Date ? new Date(program.Date).toLocaleDateString('he-IL') : "",
      "{Grade}": program.Grade || ""

    };
    let formatted = template;
    Object.keys(replacements).forEach(key => {
      formatted = formatted.replaceAll(key, String(replacements[key] || ""));
    });
    return formatted;
  };

  // 6. שמירת נוסח חדש
  const onSaveNewPattern = async () => {
    if (!newPatternName || !inputValue) return alert("נא להזין שם ונוסח");
    try {
      const maxId = patterns.length > 0 ? Math.max(...patterns.map(p => p.PatternId)) : 1000;
      const newP = await addPattern(maxId + 1, newPatternName, inputValue, "", "", "Placement");
      setPatterns(prev => [...prev, newP as any]);
      setNewPatternName("");
      setSelectedOption({ value: inputValue, label: newPatternName });
      alert("הנוסח נשמר בהצלחה בבסיס הנתונים (תחת קטגוריית שיבוץ)");
    } catch (error) { alert("שגיאה בשמירת התבנית"); }
  };

  // 7. מחיקת תבנית קיימת
  const handleDeletePattern = async () => {
    const patternToDelete = patterns.find(p => p.Message1 === inputValue);
    
    if (!patternToDelete) {
      alert("אנא בחר תבנית קיימת מהתפריט כדי למחוק אותה");
      return;
    }

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את התבנית: ${patternToDelete.Caption}?`)) {
      try {
        const { deletePattern } = await import("@/db/generalrequests");
        const { deletePatternFile } = await import("@/db/whatsapprequests");

        await Promise.all([
          deletePattern(patternToDelete.PatternId),
          deletePatternFile(patternToDelete.PatternId)
        ]);

        const currentData = await getFromStorage();
        const allRemainingPatterns = (currentData.messagePatterns || []).filter(
          (p: any) => p.PatternId !== patternToDelete.PatternId
        );
        
        await updateStorage({ ...currentData, messagePatterns: allRemainingPatterns });

        const onlyPlacementPatterns = allRemainingPatterns.filter(
          (p: any) => p.MessageContext === "Placement"
        );
        
        setPatterns(onlyPlacementPatterns);
        setInputValue("");
        setSelectedOption(null);
        alert("התבנית נמחקה בהצלחה מהמערכת 🗑️");
      } catch (error) {
        console.error("Error deleting pattern:", error);
        alert("שגיאה במחיקת התבנית");
      }
    }
  };
  
  // 8. שליחת ההודעות
  const onClickSend = useCallback(async () => {
    if (!Inner_SelectedRows?.length || !currentProgramData) return alert("לא נבחרו מדריכים או תוכנית");
    
    setIsSending(true);
    let successCount = 0;
    
    for (const guide of Inner_SelectedRows) {
      if (guide.CellPhone) {
        const personalizedMsg = parsePersonalizedMessage(inputValue, guide, currentProgramData);
        const res = await sendMessageViaWhatsApp(personalizedMsg, undefined, undefined, guide.CellPhone, "972", undefined);
        if (res.success) successCount++;
      }
    }
    
    setIsSending(false);
    alert(`התהליך הסתיים. נשלחו ${successCount} הודעות אישיות.`);
    if (LeftGridApi) LeftGridApi.deselectAll();
  }, [Inner_SelectedRows, inputValue, currentProgramData, LeftGridApi]);

   // 🔧 תיקון Hydration: לא לרנדר עד שהקומפוננטה נטענה
  if (!isMounted) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', gap: '10px', direction: 'rtl', position: 'relative' }}>
      
      {/* שורת בחירת תבנית עם כפתור מחיקה */}
      <div className="d-flex align-items-center gap-2">
        <div style={{ flex: 1 }}>
          <Select
            options={patterns.map(p => ({ value: p.Message1, label: p.Caption }))}
            value={selectedOption}
            placeholder="בחר תבנית לתוכנית"
            isClearable
            className="text-dark"
            onChange={async (opt: any) => {
              const newValue = opt?.value || "";
              
              setInputValue(newValue);
              setSelectedOption(opt);
              
              if (currentProgramData?.Programid) {
                try {
                  await updateProgramMsg(currentProgramData.Programid, newValue);
                  
                  const cache = await getFromStorage();
                  if (cache && cache.Programs) {
                    const updatedPrograms = cache.Programs.map((p: any) => 
                      p.Programid === currentProgramData.Programid 
                        ? { ...p, msg: newValue } 
                        : p
                    );
                    
                    await updateStorage({ 
                      ...cache, 
                      Programs: updatedPrograms 
                    });
                  }
                  console.log("✅ נוסח התבנית עודכן בכל המערכות");
                } catch (e) {
                  console.error("❌ שגיאה בסנכרון בחירת תבנית:", e);
                }
              }
            }}
          />
        </div>
        
        <Button 
          variant="outline-danger" 
          size="sm"
          onClick={handleDeletePattern}
          title="מחק תבנית מהמאגר"
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          🗑️
        </Button>
      </div>

      {/* אזור כתיבת ההודעה */}
      <div style={{ position: 'relative', flex: 1 }}>
        <Form.Control
          as="textarea"
          value={inputValue}
          onChange={handleTextChange}
          placeholder="כתוב הודעה... הקלד { להוספת משתנים"
          style={{ height: '100%', width: '100%', resize: 'none', fontSize: '14px', border: '1px solid #ced4da', borderRadius: '4px' }}
        />
        
        {/* תפריט הצעות צף */}
        {showSuggestions && (
          <ListGroup style={{ 
            position: 'absolute', 
            top: '20px',
            right: '10px', 
            zIndex: 1000, 
            width: '200px', 
            maxHeight: '150px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            border: '1px solid #007bff'
          }}>
            <ListGroup.Item disabled className="bg-primary text-white py-1 small fw-bold text-center">
              בחר משתנה:
            </ListGroup.Item>
            {suggestions.map((s, i) => (
              <ListGroup.Item 
                key={i} 
                action 
                onClick={() => insertSuggestion(s.value)} 
                className="d-flex justify-content-between align-items-center"
                style={{ fontSize: '12px', textAlign: 'right', padding: '8px' }}
              >
                <span>{s.label}</span>
                <code style={{ fontSize: '10px', color: '#007bff' }}>{s.value}</code>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </div>

      {/* שמירת תבנית חדשה */}
      <div className="bg-light p-2 rounded border">
        <InputGroup size="sm">
          <Form.Control 
            placeholder="שם לתבנית חדשה"
            value={newPatternName} 
            onChange={(e) => setNewPatternName(e.target.value)} 
          />
          <Button variant="outline-primary" onClick={onSaveNewPattern}>שמור כתבנית</Button>
        </InputGroup>
      </div>

      <Button variant="success" onClick={onClickSend} disabled={isSending} className="fw-bold py-2">
        {isSending ? "שולח הודעות..." : `שלח ל-${Inner_SelectedRows?.length || 0} מדריכים`}
      </Button>
    </div>
  );
};

export default SendMessagesBox;