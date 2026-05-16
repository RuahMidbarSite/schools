/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { ThemeContext } from "@/context/Theme/Theme";
import React, { ChangeEvent, useRef, useState, useContext, useEffect } from "react";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Container, Form, Row, Col, Button, Modal } from "react-bootstrap";
// --- ייבואים ---
import { 
  getModelFields, 
  getMessagePatterns, 
  getAllCities, 
  getAllReligionSectors, 
  getRoles, 
  getEducationStages, 
  getAllSchoolsTypes, 
  getAllStatuses,
  addPattern,
  deletePattern,
  addContactStatuses,
  addSchoolStatuses,
  updateContactsStatus,
  updateSchoolStatus
} from "@/db/generalrequests";

import { getAllSchools } from "@/db/schoolrequests";
import { getAllContacts, selectContacts } from "@/db/contactsRequests";
import { savePatternFile, deletePatternFile, sendMessageViaWhatsApp, syncContactsWithChatwoot } from "@/db/whatsapprequests";

import { getFromStorage, updateStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";
import { AgGridReact } from "ag-grid-react";
import MultiSelectSearchBar from "@/components/multiselectsearchbar/MultiSelectSearchBar";
import { MessageMonitor } from "./MessageMonitor";
import { getSmartMessageDelay, estimateRemainingTime } from './utils/delayUtils';

import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "./messagesForm.css";

export default function MessagesPage() {
  const { theme } = useContext(ThemeContext);
  const gridRef: any = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldStopRef = useRef(false);

  // --- States לנתונים (DB) ---
  const [rowData, setRowData] = useState<any[]>([]);
  const [colDefs, setColDefs] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [allContactsData, setAllContactsData] = useState<any[]>([]); // שמירת כל אנשי הקשר

  // --- States לפילטרים (רשימות בחירה) ---
  const [cities, setCities] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [schoolStatuses, setSchoolStatuses] = useState<string[]>([]);
  const [contactStatuses, setContactStatuses] = useState<string[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<string[]>([]);

  // --- Form States ---
  const [msg1, setMsg1] = useState("");
  const [msg2, setMsg2] = useState("");
  const [patternTitle, setPatternTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [addedFile, setAddedFile] = useState<File | null>(null);
  const [isRep, setIsRep] = useState<boolean | null>(true);
  const [schoolAmount, setSchoolAmount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Ref לסטטוס הנבחר כדי שהגריד יראה אותו בזמן אמת
  const newStatusRef = useRef(newStatus);
  useEffect(() => {
    newStatusRef.current = newStatus;
  }, [newStatus]);

  // --- States לסטטיסטיקה וניטור ---
  const [sendingStats, setSendingStats] = useState({ success: 0, missing: 0, error: 0 });
  const [showMonitor, setShowMonitor] = useState(false);
  const [delayHistory, setDelayHistory] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [estimatedFinish, setEstimatedFinish] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter Selections
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedContactStatuses, setSelectedContactStatuses] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSchoolStatuses, setSelectedSchoolStatuses] = useState([]);
// מנגנון בדיקה מחזורי לסטטוס וואטסאפ (כל 10 שניות)
 useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('http://localhost:3994/status');
        const data = await res.json();
        console.log("WhatsApp Status:", data.connected); // <-- הוסף את השורה הזו
        setIsConnected(data.connected);
      } catch (e) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); 
    return () => clearInterval(interval);
  }, []);
  // --- 1. טעינת נתונים ראשונית (תיקון הטעינה לשדות) ---
  useEffect(() => {
    const initData = async () => {
      try {
        console.log("Starting data fetch...");
        
        // שליפת נתונים מהשרת (כדי להבטיח שהשדות יתמלאו)
       const [
            schoolsData, 
            contactsData, 
            modelData, 
            citiesData,
            sectorsData,
            rolesData,
            stagesData,
            schoolTypesData,
            contactStatusesData,
            patternsData
        ] = await Promise.all([
          getAllSchools(),
          getAllContacts(),
          getModelFields("School"),
          getAllCities(),
          getAllReligionSectors(),
          getRoles(),
          getEducationStages(),
          getAllSchoolsTypes(),
          getAllStatuses("Contacts"),
          getMessagePatterns()
        ]);

        console.log("Data fetched successfully");

        // שמירת נתונים ל-State של הפילטרים
        setCities(citiesData.map((c: any) => c.CityName || c));
        setSectors(sectorsData.map((s: any) => s.ReligionName || s));
        setRoles(rolesData.map((r: any) => r.RoleName || r));
        setStages(stagesData.map((s: any) => s.StageName || s));
        setSchoolTypes(schoolTypesData.map((t: any) => t.TypeName || t));
        
        // חילוץ סטטוסים של בתי ספר ישירות מנתוני בתי הספר (מבטיח התאמה מדויקת לדף בתי ספר)
        const uniqueSchoolStatuses = Array.from(
            new Set(schoolsData.map((s: any) => s.Status || s.status || s['סטטוס']).filter(Boolean))
        ) as string[];
        setSchoolStatuses(uniqueSchoolStatuses);

       // טיפול בסטטוסים (סטטוס לאחר שליחה) - שילוב של מילון הסטטוסים עם הסטטוסים הקיימים בפועל בשטח
        const dbContactStatuses = contactStatusesData.map((s: any) => s.StatusName || s.value || s);
        const dynamicStatuses = [
            ...schoolsData.map((s: any) => s.Status || s.status || s['סטטוס']),
            ...contactsData.map((c: any) => c.Status || c.status || c['סטטוס'])
        ];
        
        const combinedContactStatuses = Array.from(
            new Set([...dbContactStatuses, ...dynamicStatuses].filter(Boolean))
        ) as string[];
        
        setContactStatuses(combinedContactStatuses);

        // תבניות הודעה
        setPatterns(patternsData);
        setOptions(patternsData.filter((p:any) => p.MessageContext !== "Placement").map((p:any) => ({ value: p.PatternId, label: p.Caption })));

        setAllContactsData(contactsData); // שמירה בצד לשימוש עתידי
      // הגדרת עמודות לטבלה עם לוגיקה של צבע לסטטוס
        const dynamicCols = modelData[0].map((field: string, i: number) => {
          const headerName = modelData[1][i];
          
          // הגדרת בסיס לעמודה
          const colDef: any = {
            field: field, 
            headerName: headerName, 
            filter: true, 
            sortable: true, 
            flex: 1,
            editable: true // מאפשר עריכה בגריד
          };

          // לוגיקה לצביעת הסטטוס אם הוא תואם לסטטוס החדש שנבחר
          if (headerName === "סטטוס" || field === "Status") {
             colDef.cellStyle = (params: any) => {
                 // שימוש ב-Ref כדי לקבל את הערך העדכני ביותר ללא תלות ב-Render
                 const selectedStatus = newStatusRef.current?.value || newStatusRef.current;
                 
                 // אם הערך בתא שווה לסטטוס שנבחר למעלה -> צבע בירוק
                 if (params.value && selectedStatus && String(params.value) === String(selectedStatus)) {
                      return { backgroundColor: '#198754', color: 'white', fontWeight: 'bold' };
                 }
                 return null;
             };
          }
          return colDef;
        });

        const phoneCol = {
          headerName: "טלפון נייד",
          valueGetter: (params: any) => {
            const schoolId = params.data.Schoolid || params.data.SchoolId;
            const repId = params.data.RepresentiveID || params.data.RepresentativeId;
            const contact = contactsData.find((c: any) => 
              String(c.Contactid) === String(repId) || 
              (String(c.SchoolId) === String(schoolId) && c.IsRepresentive)
            );
            return contact ? contact.Cellphone || contact.Phone || "" : "";
          }
        };

        setColDefs([...dynamicCols, phoneCol]);
        setRowData(schoolsData);
        setSchools(schoolsData);

      } catch (err) { console.error("Critical Error loading data:", err); }
    };
    initData();
  }, []);

  // --- 2. סינון חי ---
  useEffect(() => {
    const filtered = schools.filter(s => {
      const schoolStatus = s.Status || s.status || s['סטטוס'];
      return (selectedCities.length === 0 || selectedCities.includes(s.City)) &&
      (selectedSectors.length === 0 || selectedSectors.includes(s.ReligiousSector)) &&
      (selectedStages.length === 0 || selectedStages.includes(s.EducationStage)) &&
      (selectedTypes.length === 0 || selectedTypes.includes(s.SchoolType)) &&
      (selectedSchoolStatuses.length === 0 || selectedSchoolStatuses.includes(schoolStatus));
    });
    setRowData(schoolAmount > 0 ? filtered.slice(0, schoolAmount) : filtered);
  }, [selectedCities, selectedSectors, selectedStages, selectedTypes, selectedSchoolStatuses, schoolAmount, schools]);
  
  // --- Handlers ---
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAddedFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const handleChooseContacts = async () => {
    const ids = rowData.map(s => s.Schoolid || s.SchoolId);
    if (ids.length === 0) return alert("לא נבחרו בתי ספר");
    const contacts = await selectContacts(ids);
    const filtered = contacts.filter((c: any) => isRep === null || c.IsRepresentive === isRep);
    alert(`נמצאו ${filtered.length} אנשי קשר מתוך ${contacts.length}\nבתי ספר: ${rowData.length}`);
  };

  const handleSavePattern = async () => {
    if (!patternTitle) return alert("חובה להזין שם תבנית");
    try {
      const maxId = patterns.length > 0 ? Math.max(...patterns.map(p => p.PatternId)) : 0;
      const nextId = maxId + 1;
      const newPattern = await addPattern(nextId, patternTitle, msg1, msg2, fileName);
      if (addedFile) await savePatternFile(nextId, addedFile);
      
      const updated = [...patterns, newPattern];
      setPatterns(updated);
      setOptions(updated.map(p => ({ value: p.PatternId, label: p.Caption })));
      
      alert("נשמר בהצלחה!");
    } catch (e) { console.error(e); alert("שגיאה בשמירה"); }
  };

  const handleDeletePattern = async () => {
    if (!selectedOption) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק את התבנית?")) return;

    try {
      // 1. מחיקה מהשרת
      await deletePattern(selectedOption.value);
      // ניסיון למחוק קובץ (גם אם נכשל, נמשיך למחיקה מהממשק)
      try { await deletePatternFile(selectedOption.value); } catch (e) {}

      // 2. עדכון הממשק (State) באופן מיידי
      const updatedPatterns = patterns.filter(p => p.PatternId !== selectedOption.value);
      setPatterns(updatedPatterns);

      // בנייה מחדש של רשימת האפשרויות (תוך שמירה על סינון Placement אם קיים)
      const updatedOptions = updatedPatterns
        .filter((p: any) => p.MessageContext !== "Placement") 
        .map((p: any) => ({ value: p.PatternId, label: p.Caption }));

      setOptions(updatedOptions);

      // 3. איפוס השדות
      setPatternTitle(""); 
      setMsg1(""); 
      setMsg2(""); 
      setFileName("");
      setAddedFile(null);
      setSelectedOption(null);

      alert("התבנית נמחקה בהצלחה");
    } catch (e) { 
      console.error(e); 
      alert("שגיאה במחיקת התבנית"); 
    }
  };
// פונקציית עזר להחלפת משתנים בהודעה
  const replaceMessageVariables = (message: string, contact: any) => {
    if (!message) return message;
    // מחליף את {name} בשם איש הקשר או "מנהל/ת" אם אין שם
    return message.replace(/{name}/gi, contact.FirstName || "מנהל/ת");
  };
    const handleSendMessages = async () => {
    if (!confirm("האם להתחיל בשליחת ההודעות?")) return;
    
    // 1. שליפת אנשי הקשר
    const ids = rowData.map(s => s.Schoolid || s.SchoolId);
    const contacts = await selectContacts(ids);
    const filteredContacts = contacts.filter((c: any) => isRep === null || c.IsRepresentive === isRep);
    
    const contactsToSend = filteredContacts.filter((c: any) => c.Cellphone && c.Cellphone.length > 5);
    const missingPhoneCount = filteredContacts.length - contactsToSend.length;

    if (contactsToSend.length === 0) {
      alert("לא נמצאו אנשי קשר תקינים לשליחה");
      return;
    }

    setIsSending(true);
    shouldStopRef.current = false;
    setSendingStats({ success: 0, missing: missingPhoneCount, error: 0 });
    
    // --> קריאה לשרת להגדרת חסימת האבטחה לפי כמות אנשי הקשר בפועל
    try {
        await fetch('http://localhost:3994/StartBatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: contactsToSend.length })
        });
    } catch (e) {
        console.error("Failed to set security limit on server", e);
    }
    
    setIsSyncing(true);
    
  // הכנת מערך אנשי הקשר לסנכרון מול צ'אטווט
    const chatwootPayload = contactsToSend.map((contact: any) => {
        const school = rowData.find(s => String(s.Schoolid || s.SchoolId) === String(contact.Schoolid || contact.SchoolId));
        
        const fullName = `${contact.FirstName || ""} ${contact.LastName || ""}`.trim();
        const role = contact.Role || contact.RoleName || "";
        const eduStage = school ? (school.Stage || school.EducationStage || "") : ""; // שים לב: ודא שזה שם השדה המדויק שלך לשלב חינוך
        const schoolName = school ? (school.SchoolName || school.Name || "") : "";
        const city = contact.City || (school ? school.City : "") || "";
        
        // בניית התבנית הארוכה: מחברים את כולם עם רווח בלבד
        const combinedName = [fullName, role, eduStage, schoolName, city].filter(Boolean).join(" ");

        return {
            phone: contact.Cellphone,
            name: combinedName || contact.Cellphone, // השם הארוך נשלח בתור השם הראשי
            role: role,
            school: schoolName,
            city: city
        };
    });

    // סנכרון מקדים מול צ'אטווט
    await syncContactsWithChatwoot(chatwootPayload);
    
    setIsSyncing(false);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // 2. לולאת השליחה
    for (let i = 0; i < contactsToSend.length; i++) {
        if (shouldStopRef.current) {
            alert("השליחה נעצרה על ידי המשתמש.");
            break;
        }
        
        const contact = contactsToSend[i];
        const msg1Final = replaceMessageVariables(msg1, contact);
        const msg2Final = replaceMessageVariables(msg2, contact);

        console.log(`📤 שולח ל: ${contact.FirstName} (${contact.Cellphone})`);

        try {
            // חילוץ פרטי בית הספר כדי להעביר ל-Chatwoot
            const school = rowData.find(s => String(s.Schoolid || s.SchoolId) === String(contact.Schoolid || contact.SchoolId));
            
           const contactData = {
    // שליחת השם הפרטי בלבד ללא חיבור שם המשפחה או תפקיד
    ContactName: contact.FirstName || "", 
    RoleName: contact.Role || contact.RoleName || "",
    SchoolName: school ? (school.SchoolName || school.Name || "") : "",
    CityName: contact.City || (school ? school.City : "") || ""
};

           // מפעיל את המסלול החדש של 3 התבניות במטא
            const metaTemplateName = selectedOption ? "multi_template_flow" : undefined;

            const result = await sendMessageViaWhatsApp(
                msg1Final, 
                msg2Final, 
                addedFile, 
                contact.Cellphone,
                "972",
                selectedOption?.value,
                contactData,
                metaTemplateName
            );
            
            if (result.success) {
                setSendingStats(prev => ({ ...prev, success: prev.success + 1 }));
                
                // --- לוגיקת עדכון סטטוסים (DB + ויזואלי) ---
                if (newStatus && newStatus.value) {
                    const statusVal = newStatus.value;

                    // 1. עדכון סטטוס איש קשר ב-DB
                    await updateContactsStatus(statusVal, [contact.Contactid]);

                    // 2. בדיקה אם הוא נציג - כדי לעדכן גם את בית הספר
                    const isRepresentative = contact.IsRepresentative || contact.IsRepresentive || contact.isRepresentative;
                    
                    if (isRepresentative) {
                        const schoolId = Number(contact.Schoolid || contact.SchoolId);
                        
                        // א. עדכון סטטוס בית ספר ב-DB
                        if (schoolId) {
                            await updateSchoolStatus(statusVal, [schoolId]);

                            // ב. עדכון ויזואלי בטבלה (AgGrid) בזמן אמת
                            if (gridRef.current && gridRef.current.api) {
                                const rowNode = gridRef.current.api.getRowNode(String(schoolId));
                                if (rowNode) {
                                    rowNode.setDataValue('Status', statusVal);
                                    // רענון התא כדי שהצבע הירוק יתפוס
                                    gridRef.current.api.refreshCells({ 
                                        rowNodes: [rowNode], 
                                        columns: ['Status', 'status', 'סטטוס'], 
                                        force: true 
                                    });
                                }
                            }
                        }
                    }
                }
                // -------------------------------------------

            } else {
                console.error("❌ שגיאה בשליחה:", result.error);
                setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
            }
        } catch (e) {
            console.error("❌ שגיאה קריטית:", e);
            setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
        }

        if (i < contactsToSend.length - 1) {
          const delay = getSmartMessageDelay(contactsToSend.length, i);
            // המרה למספר עם ספרה אחת אחרי הנקודה (למשל: 3.5 במקום 3.51234)
            const seconds = Number((delay / 1000).toFixed(1)); 
            setDelayHistory(prev => [...prev, { delay: seconds, type: 'normal' }]);
            await sleep(delay);
        }
    }
    
    setIsSending(false);
    alert("תהליך השליחה הסתיים.");
  };
// --- לוגיקה לגרירת חלון הניטור ---
  useEffect(() => {
    if (!showMonitor) return;

    // השהייה קטנה כדי לוודא שהאלמנט נוצר ב-DOM
    const timer = setTimeout(() => {
      const floatingWindow = document.getElementById('monitor-window');
      const header = document.getElementById('monitor-header');
      
      if (!floatingWindow || !header) return;

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // חישוב המיקום ההתחלתי הנוכחי
        const rect = floatingWindow.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        header.style.cursor = 'grabbing';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // עדכון המיקום (שימוש ב-Fixed כדי לאפשר גלילה ברקע)
        floatingWindow.style.left = `${initialLeft + dx}px`;
        floatingWindow.style.top = `${initialTop + dy}px`;
        // מסירים את ה-Transform אם היה, כי אנחנו מזיזים עם left/top
        floatingWindow.style.transform = 'none'; 
      };

      const onMouseUp = () => {
        isDragging = false;
        header.style.cursor = 'move';
      };

      header.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      return () => {
        header.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [showMonitor]);
  return (
    <div className="messages-page-wrapper p-2" style={{ direction: 'rtl' }}>
      <Container fluid className="bg-white rounded p-3 mb-1 shadow-sm" style={{ marginTop: '-20px' }}>
        <Row className="g-3">
          
          {/* סקציה 1: תבניות */}
          <Col lg={5} className="p-3 rounded d-flex flex-column text-end" style={{ backgroundColor: '#fffdf4', border: '1px solid #f9ebcd', minHeight: '380px' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold m-0 w-100">📋 תבניות ותוכן הודעות</h6>
                <div className="d-flex gap-1">
                    <Button variant="secondary" size="sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleSavePattern}>שמור</Button>
                    <Button variant="danger" size="sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleDeletePattern}>מחק</Button>
                </div>
            </div>

            <Row className="g-2 mb-2 align-items-end">
              <Col md={7}>
                <label className="small d-block fw-bold">תבנית קיימת</label>
                <Select instanceId="p-sel" options={options} value={selectedOption} onChange={(val) => {
                  setSelectedOption(val);
                  const p = patterns.find(x => x.PatternId === val?.value);
                  if(p) { setMsg1(p.Message1); setMsg2(p.Message2); setPatternTitle(p.Caption); setFileName(p.File || ""); }
                }} placeholder="בחר תבנית..." />
              </Col>
              <Col md={5}>
                <label className="small d-block fw-bold">שם תבנית חדשה</label>
                <Form.Control size="sm" placeholder="שם..." value={patternTitle} onChange={e => setPatternTitle(e.target.value)} />
              </Col>
            </Row>

            <Row className="g-2 flex-grow-1">
              <Col md={7} className="d-flex flex-column">
                <label className="small d-block fw-bold">הודעה ראשונה *</label>
                <Form.Control as="textarea" className="flex-grow-1 small" value={msg1} onChange={e => setMsg1(e.target.value)} style={{ resize: 'none' }} />
              </Col>
              <Col md={5} className="d-flex flex-column gap-2">
                <div>
                  <label className="small d-block fw-bold text-center w-100">קובץ</label>
                  <div onClick={() => fileInputRef.current?.click()} className="d-flex align-items-center justify-content-center border rounded bg-white" style={{ cursor: 'pointer', borderStyle: 'dashed', height: '35px' }}>
                    <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} />
                    <span className="fs-6 me-1">📎</span>
                    <span style={{ fontSize: '10px' }}>{fileName || "צרף"}</span>
                  </div>
                </div>
                <div className="flex-grow-1 d-flex flex-column">
                  <label className="small d-block fw-bold text-center w-100">הודעה משלימה</label>
                  <Form.Control as="textarea" className="flex-grow-1 small" value={msg2} onChange={e => setMsg2(e.target.value)} style={{ resize: 'none' }} />
                </div>
              </Col>
            </Row>
          </Col>

          {/* סקציה 2: פילטרים + סקציית סטטיסטיקה וניטור נפרדת */}
          <Col lg={4} className="p-3 rounded d-flex flex-column text-end" style={{ backgroundColor: '#f5fff8', border: '1px solid #dff0e4' }}>
            <h6 className="fw-bold mb-3 w-100">🔍 פילטרים</h6>
            <Row className="g-2 mb-2">
              <Col md={6}><label className="small fw-bold d-block">סוג בית ספר</label><MultiSelectSearchBar selected={selectedTypes} setSelected={setSelectedTypes} options={schoolTypes} labelKey={o=>o} /></Col>
              <Col md={6}><label className="small fw-bold d-block">מגזר</label><MultiSelectSearchBar selected={selectedSectors} setSelected={setSelectedSectors} options={sectors} labelKey={o=>o} /></Col>
              <Col md={6}><label className="small fw-bold d-block">שלב חינוך</label><MultiSelectSearchBar selected={selectedStages} setSelected={setSelectedStages} options={stages} labelKey={o=>o} /></Col>
              <Col md={6}><label className="small fw-bold d-block">עיר</label><MultiSelectSearchBar selected={selectedCities} setSelected={setSelectedCities} options={cities} labelKey={o=>o} /></Col>
              <Col md={6}><label className="small fw-bold d-block">סטטוס איש קשר</label><MultiSelectSearchBar selected={selectedContactStatuses} setSelected={setSelectedContactStatuses} options={contactStatuses} labelKey={o=>o} /></Col>
              <Col md={6}><label className="small fw-bold d-block">תפקיד</label><MultiSelectSearchBar selected={selectedRoles} setSelected={setSelectedRoles} options={roles} labelKey={o=>o} /></Col>
            </Row>

            {/* סקציה נפרדת: סטטיסטיקה וניטור (רקע שונה כנדרש) */}
            <div className="mt-auto p-2 rounded border shadow-sm" style={{ backgroundColor: '#eef2f5', borderTop: '2px solid #dee2e6' }}>
              {/* שורה 1: סטטיסטיקות */}
              <Row className="text-center g-0 align-items-center fw-bold small mb-2">
                <Col xs={3} className="border-start">
                  <span className="text-secondary d-block" style={{fontSize: '10px'}}>נבחרו</span>
                  <span className="fs-6 text-dark">{rowData.length}</span>
                </Col>
                <Col xs={3} className="border-start">
                  <span className="text-secondary d-block" style={{fontSize: '10px'}}>הצלחה</span>
                  <span className="fs-6 text-success">{sendingStats.success}</span>
                </Col>
                <Col xs={3} className="border-start">
                  <span className="text-secondary d-block" style={{fontSize: '10px'}}>חסר טלפון</span>
                  <span className="fs-6" style={{color: '#d63384'}}>{sendingStats.missing}</span>
                </Col>
                <Col xs={3}>
                  <span className="text-secondary d-block" style={{fontSize: '10px'}}>תקלות</span>
                  <span className="fs-6 text-danger">{sendingStats.error}</span>
                </Col>
              </Row>
              
              {/* שורה 2: כפתור ניטור - פותח מודל */}
              <div className="text-center">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="w-100 py-0" 
                  style={{ fontSize: '11px', borderColor: '#ced4da', color: '#495057', backgroundColor: '#fff' }}
                  onClick={() => setShowMonitor(true)}
                >
                  📊 פתח חלון ניטור זמנים
                </Button>
              </div>
            </div>
          </Col>

          {/* סקציה 3: הגדרות */}
          <Col lg={3} className="p-3 rounded d-flex flex-column text-end" style={{ backgroundColor: '#f0f7ff', border: '1px solid #daeaff' }}>
            <h6 className="fw-bold mb-3 w-100">⚙️ הגדרות ופעולות</h6>
            <div className="bg-white p-1 rounded border mb-2 d-flex justify-content-around small">
              <Form.Check type="radio" label="נציגים" checked={isRep === true} onChange={()=>setIsRep(true)} />
              <Form.Check type="radio" label="לא" checked={isRep === false} onChange={()=>setIsRep(false)} />
              <Form.Check type="radio" label="שניהם" checked={isRep === null} onChange={()=>setIsRep(null)} />
            </div>
            <Form.Group className="mb-2"><label className="small fw-bold">כמות בתי ספר</label><Form.Control type="number" size="sm" value={schoolAmount} onChange={e=>setSchoolAmount(Number(e.target.value))} /></Form.Group>
            <Row className="g-2 mb-2">
              <Col md={7}><label className="small fw-bold d-block">סטטוס בית ספר</label><MultiSelectSearchBar selected={selectedSchoolStatuses} setSelected={setSelectedSchoolStatuses} options={schoolStatuses} labelKey={o=>o} /></Col>
              <Col md={5} className="d-flex align-items-end"><Button variant="outline-primary" size="sm" className="w-100 fw-bold" style={{fontSize: '10px'}} onClick={handleChooseContacts}>👥 בחר אנשי קשר</Button></Col>
            </Row>
            <Form.Group className="mb-3"><label className="small fw-bold">סטטוס לאחר שליחה</label><CreatableSelect instanceId="s-status" value={newStatus} onChange={setNewStatus} options={contactStatuses.map(s=>({value:s,label:s}))} placeholder="בחר..." /></Form.Group>
            <div className="d-flex gap-2 mt-auto">
              <Button 
                    variant={isConnected ? "primary" : "outline-danger"} 
                    className="flex-grow-1 fw-bold" 
                    onClick={handleSendMessages} 
                    disabled={isSending}
                >
                   {isSyncing ? "⏳ מסנכרן אנשי קשר..." : (isSending ? "שולח..." : (isConnected ? "📤 שלח הודעות" : "❌ וואטסאפ מנותק"))}
                </Button>
                {isSending && <Button variant="danger" onClick={() => shouldStopRef.current = true}>עצור</Button>}
                <Button variant="info" className="text-white border-0">🧪 טסט</Button>
            </div>
          </Col>
        </Row>
      </Container>

      <div className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} style={{ height: '550px', width: '100%', marginTop: '5px' }}>
        <AgGridReact 
            ref={gridRef} 
            rowData={rowData} 
            columnDefs={colDefs} 
            enableRtl={true} 
            pagination={true} 
            paginationPageSize={20} 
            getRowId={(params) => String(params.data.Schoolid || params.data.SchoolId)}
        />
      </div>

      {/* === חלון ניטור זמנים צף (ניתן לגרירה ולשינוי גודל) === */}
      {showMonitor && (
        <div
          id="monitor-window"
          style={{
            position: 'fixed',
            top: '50px',    
            left: '50px',   
            width: '650px', // ✅ רוחב רחב יותר לגרף
            height: '220px',// ✅ גובה נמוך יותר כדי להסיר שטחים לבנים
            minWidth: '300px',
            minHeight: '150px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            resize: 'both',     
            overflow: 'auto',   
            direction: 'rtl'
          }}
        >
          {/* כותרת גרירה */}
          <div
            id="monitor-header"
            className="d-flex justify-content-between align-items-center px-2 py-1 bg-light border-bottom"
            style={{ cursor: 'move', userSelect: 'none', height: '30px' }}
          >
            <span className="fw-bold small">📊 לוג שליחה</span>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 text-secondary text-decoration-none" 
              style={{ fontSize: '1.2rem', lineHeight: 1 }}
              onClick={() => setShowMonitor(false)}
            >
              &times;
            </Button>
          </div>

          {/* תוכן נגלל - הורדנו padding (p-0) והגדרנו overflow: hidden כדי למנוע גלילה כפולה */}
          <div className="flex-grow-1 p-0" style={{ overflow: 'hidden', backgroundColor: '#fff', position: 'relative' }}>
             {/* משתמשים ב-absolute כדי למתוח את התוכן על כל החלון */}
             <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '5px' }}>
                <MessageMonitor history={delayHistory} isSending={isSending} />
             </div>
          </div>
          
          {/* סטטוס תחתון קטן */}
          <div className="p-0 bg-white border-top text-center text-muted" style={{ fontSize: '9px' }}>
            ⤡ שנה גודל
          </div>
        </div>
      )}

    </div>
  );
}