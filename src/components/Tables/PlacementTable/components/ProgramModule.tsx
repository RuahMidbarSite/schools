"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Col, Row } from "react-bootstrap";
import ProgramModal from "./CustomProgramModal";
import { AssignGuides } from "./AssignGuides";
import { ProgramDetails } from "./ProgramDetails";
import { Assigned_Guide, ColorCandidate, Guide, Guides_ToAssign, Program, School, SchoolsContact, StatusPrograms, Years } from "@prisma/client";
import { GridApi } from "ag-grid-community";
import SendMessagesBox from "@/components/Tables/PlacementTable/components/SendMessages";
import styles from "./ProgramModule.module.css";
import { deleteAssignedInstructor } from "@/db/instructorsrequest";
import { useContactComponent } from "@/util/Google/GoogleContacts/ContactComponent";
import { Spinner, Alert, Badge, Card, Button } from "react-bootstrap";
import { FaRobot, FaUserTie, FaCheckCircle } from "react-icons/fa";

type ProgramProps = {
   CurrentProgram: { label: string, value: number },
   setCurrentProgram: React.Dispatch<React.SetStateAction<{ label: string, value: number }>>,
   LeftGridApi: GridApi<Guide>,
   RightGridApi: GridApi<Guide>,
   SelectedRows: Guide[]
   setAssigned_guides: any
   AllPrograms: Program[],
   AllCandidates: Guides_ToAssign[],
   AllCandidates_Details: Guide[],
   AllSchools: School[],
   AllContacts: SchoolsContact[],
   All_Assigned_Guides: Assigned_Guide[],
   All_Assigned_Guides_Details: Guide[]
   setAllAssignedGuides: any,
   setAllAssignedGuides_Details: any,
   AllYears: Years[],
   AllStatuses: StatusPrograms[],
   setAllCandidates_Details: any,
   setAllCandidates: any,
   AllColorCandidates: ColorCandidate[],
   setAllColorCandidates: any
}

// מבנה התשובה מה-AI
type AiRecommendation = {
  name: string;
  score: number;
  reason: string;
};

type AiResponse = {
  recommendations: AiRecommendation[];
  summary: string;
};

export const ProgramModule = ({
   setAllCandidates_Details,
   setAllCandidates,
   CurrentProgram,
   setCurrentProgram,
   LeftGridApi,
   RightGridApi,
   SelectedRows,
   setAssigned_guides,
   AllPrograms,
   AllCandidates,
   AllCandidates_Details,
   AllSchools,
   AllContacts,
   All_Assigned_Guides,
   All_Assigned_Guides_Details,
   setAllAssignedGuides,
   setAllAssignedGuides_Details,
   AllYears,
   AllStatuses,
   AllColorCandidates,
   setAllColorCandidates
}: ProgramProps) => {

   const [ChosenCandidate, setChosenCandidate] = useState<{ guide: Guide }>()
   const [AuthenticateActivate] = useContactComponent();
   useEffect(() => {
   if (typeof window === 'undefined') return;

   const initGapiClient = () => {
      if ((window as any).gapi) {
         (window as any).gapi.load('client', async () => {
            try {
               await (window as any).gapi.client.init({
                  apiKey: process.env.NEXT_PUBLIC_API_KEY,
                  discoveryDocs: ['https://people.googleapis.com/$discovery/rest?version=v1'],
               });
               console.log('✅ gapi.client initialized in ProgramModule');
            } catch (err) {
               console.error('❌ gapi.client init error:', err);
            }
         });
      }
   };

   if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      document.body.appendChild(gsiScript);
   }

   if (!document.querySelector('script[src*="apis.google.com/js/api"]')) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = initGapiClient;
      document.body.appendChild(gapiScript);
   } else if ((window as any).gapi) {
      // הסקריפט כבר קיים אבל client אולי לא אותחל
      initGapiClient();
   }
}, []);
   
   // 🔥 State עבור AI - כעת ב-ProgramModule
   const [aiLoading, setAiLoading] = useState(false);
   const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);
   const [aiError, setAiError] = useState<string | null>(null);
   const [showAiModal, setShowAiModal] = useState(false); // 🔥 State למודאל
const handleAddToGoogleContacts = useCallback((guides: Guide[]) => {
   if (!guides || guides.length === 0) return;

   const createContact = AuthenticateActivate("create_contact", "contacts");
   let successCount = 0;

   guides.forEach((guide) => {
      createContact({
         data: {
            name: `${guide.FirstName ?? ''} ${guide.LastName ?? ''}`.trim(),
            cellPhone: guide.CellPhone ?? '',
            emailAddress: '',
         },
         callbackFunction: ({ resourceName }: { resourceName: string }) => {
            successCount++;
            console.log(`✅ נוצר איש קשר: ${guide.FirstName} ${guide.LastName} → ${resourceName}`);
            if (successCount === guides.length) {
               alert(`✅ ${successCount} אנשי קשר נוספו בהצלחה לגוגל`);
            }
         },
      });
   });
}, [AuthenticateActivate]);

   // 🔥 לוגיקת גרירה פשוטה לחלון הצף
   useEffect(() => {
      if (!showAiModal) return;

      const timer = setTimeout(() => {
         const floatingWindow = document.querySelector('.ai-floating-window') as HTMLElement;
         const header = document.querySelector('.ai-window-header') as HTMLElement;
         
         if (!floatingWindow || !header) return;

         let isDragging = false;
         let offsetX = 0;
         let offsetY = 0;

         const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            offsetX = e.clientX - floatingWindow.offsetLeft;
            offsetY = e.clientY - floatingWindow.offsetTop;
            header.style.cursor = 'grabbing';
         };

         const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            
            floatingWindow.style.left = `${e.clientX - offsetX}px`;
            floatingWindow.style.top = `${e.clientY - offsetY}px`;
            floatingWindow.style.transform = 'none';
         };

         const onMouseUp = () => {
            isDragging = false;
            header.style.cursor = 'move';
         };

         header.addEventListener('mousedown', onMouseDown);
         document.addEventListener('mousemove', onMouseMove);
         document.addEventListener('mouseup', onMouseUp);

         return () => {
            header.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
         };
      }, 100);

      return () => clearTimeout(timer);
   }, [showAiModal]);

   const TitleMessage = useMemo(() => "שלח הודעה למועמדים", [])

   // 🔥 פונקציית ה-AI המועברת לכאן
   const handleAiConsultation = useCallback(async () => {
      setAiLoading(true);
      setAiResponse(null);
      setAiError(null);
      setShowAiModal(true); // 🔥 פתיחת המודאל

      try {
         if (!CurrentProgram?.label || CurrentProgram.value === -1) {
            throw new Error("חסרים נתוני תוכנית לביצוע הבדיקה");
         }

         // שליפת פרטי התוכנית
         const currentProgramData = AllPrograms?.find(p => p.Programid === CurrentProgram.value);
         if (!currentProgramData) {
            throw new Error("לא נמצאה תוכנית");
         }

         const currentSchool = AllSchools?.find(s => s.Schoolid === currentProgramData.Schoolid);

         // שליפת 10 המועמדים מהטבלה השמאלית
         const topCandidates: any[] = [];
         if (LeftGridApi) {
            let count = 0;
            LeftGridApi.forEachNodeAfterFilterAndSort((node) => {
               if (count < 10 && node.data) {
                  const { FirstName, LastName, City, Gender, Guideid } = node.data;
                  topCandidates.push({
                     id: Guideid,
                     Name: `${FirstName} ${LastName}`,
                     City: City || "לא צוין",
                     Gender: Gender || "לא צוין",
                  });
                  count++;
               }
            });
         }

         if (topCandidates.length === 0) {
            throw new Error("לא נמצאו מועמדים בטבלה. אנא וודא שיש מועמדים מוצגים.");
         }

         const candidatesText = topCandidates.map(c => 
            `- שם: ${c.Name}, עיר: ${c.City}, מגדר: ${c.Gender}`
         ).join('\n');

         const promptData = `
            אני זקוק לעזרה בשיבוץ מדריך לתוכנית חינוכית.
            
            פרטי המוסד והתוכנית:
            - שם בית ספר: ${currentSchool?.SchoolName || "לא צוין"}
            - עיר: ${currentProgramData.CityName || "לא צוין"}
            - אזור: ${currentProgramData.District || "לא צוין"}
            - שכבה: ${currentProgramData.Grade || "לא צוין"}
            - שם התוכנית: ${CurrentProgram.label}
            - פרטים נוספים: ${currentProgramData.Details || "אין פרטים נוספים"}
            
            להלן רשימה של 10 המועמדים המובילים (לאחר סינון):
            ${candidatesText}
            
            אנא נתח את ההתאמה בין דרישות המוסד למועמדים.
            
            החזר תשובה בפורמט JSON בלבד במבנה הבא (ללא טקסט נוסף):
            {
               "summary": "סיכום קצר של השיקולים...",
               "recommendations": [
                  { "name": "שם המועמד", "score": 95, "reason": "הסבר קצר למה הוא מתאים..." },
                  { "name": "שם המועמד", "score": 88, "reason": "..." },
                  { "name": "שם המועמד", "score": 80, "reason": "..." }
               ]
            }
            בחר את 3 המועמדים המתאימים ביותר מתוך הרשימה.
         `;

         const response = await fetch('/api/route-placement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptData }),
         });

         if (!response.ok) {
            throw new Error(`שגיאת שרת: ${response.status}`);
         }

         const data = await response.json();

         if (!data || (!data.summary && !data.recommendations)) {
            throw new Error("התשובה מהשרת לא תקינה או ריקה");
         }

         setAiResponse(data);

      } catch (error: any) {
         console.error("❌ [AI Consultation Error]:", error);
         setAiError(error.message || "שגיאה לא ידועה בעת ביצוע ההתייעצות");
      } finally {
         setAiLoading(false);
      }
   }, [CurrentProgram, LeftGridApi, AllPrograms, AllSchools]);

   // 🔥 פונקציה להסרת מדריך
   const handleRemoveGuide = useCallback(async (guideId: number) => {
      try {
         await deleteAssignedInstructor(CurrentProgram.value, guideId);
         
         const updatedAssigned = All_Assigned_Guides.filter(
            ag => !(ag.Guideid === guideId && ag.Programid === CurrentProgram.value)
         );
         const updatedDetails = All_Assigned_Guides_Details.filter(g => g.Guideid !== guideId);
         
         setAllAssignedGuides(updatedAssigned);
         setAllAssignedGuides_Details(updatedDetails);
         
         const guideToReturn = All_Assigned_Guides_Details.find(g => g.Guideid === guideId);
         if (guideToReturn && RightGridApi) {
            RightGridApi.applyTransaction({ add: [guideToReturn] });
         }
         
         if (LeftGridApi) {
            LeftGridApi.forEachNode((node) => {
               if (node.data?.Guideid === guideId) {
                  LeftGridApi.applyTransaction({ remove: [node.data] });
               }
            });
         }
         
      } catch (error) {
         console.error("❌ שגיאה בהסרת מדריך:", error);
         alert("שגיאה בהסרת המדריך");
      }
   }, [CurrentProgram, All_Assigned_Guides, All_Assigned_Guides_Details, setAllAssignedGuides, setAllAssignedGuides_Details, LeftGridApi, RightGridApi]);

   return (
      <Row className="g-3">
         {/* עמודה שמאלית - כרטיסיית תוכניות */}
         <Col xs={12} md={12} lg={8}>
            <div className={styles.leftColumn}>
               <div className={styles.sectionTitle}>
                  🎯 כרטיסיית תוכניות
               </div>

               <div className={styles.programCard}>
                  <ProgramDetails
   CurrentProgram={CurrentProgram}
   AllPrograms={AllPrograms}
   AllSchools={AllSchools}
   All_Assigned_Guides_Details={All_Assigned_Guides_Details}
   All_Assigned_Guides={All_Assigned_Guides}
   onRemoveGuide={handleRemoveGuide}
   onAddToGoogleContacts={handleAddToGoogleContacts}
/>
               </div>


               {/* 🔥 חלון צף פשוט לתוצאות AI */}
               {showAiModal && (
                  <>
                     {/* רקע שקוף */}
                     <div 
                        style={{
                           position: 'fixed',
                           top: 0,
                           left: 0,
                           right: 0,
                           bottom: 0,
                           backgroundColor: 'rgba(0, 0, 0, 0.3)',
                           zIndex: 1040,
                        }}
                        onClick={() => setShowAiModal(false)}
                     />
                     
                     {/* החלון הצף */}
                     <div 
                        className="ai-floating-window"
                        style={{
                           position: 'fixed',
                           top: '50%',
                           left: '50%',
                           transform: 'translate(-50%, -50%)',
                           width: '90%',
                           maxWidth: '800px',
                           maxHeight: '80vh',
                           backgroundColor: 'white',
                           borderRadius: '12px',
                           boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                           zIndex: 1050,
                           display: 'flex',
                           flexDirection: 'column',
                        }}
                        onClick={(e) => e.stopPropagation()}
                     >
                        {/* כותרת - ניתנת לגרירה */}
                        <div 
                           className="ai-window-header"
                           style={{
                              padding: '20px',
                              borderBottom: '2px solid #e2e8f0',
                              cursor: 'move',
                              userSelect: 'none',
                              background: '#f8f9fa',
                              borderRadius: '12px 12px 0 0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                           }}
                        >
                           <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>
                              ✨ התייעצות AI לשיבוץ מדריכים
                           </h3>
                           <button
                              onClick={() => setShowAiModal(false)}
                              style={{
                                 background: 'none',
                                 border: 'none',
                                 fontSize: '1.5rem',
                                 cursor: 'pointer',
                                 color: '#718096',
                                 padding: '0 10px',
                              }}
                           >
                              ×
                           </button>
                        </div>

                        {/* תוכן */}
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                           {aiLoading && (
                              <div className="text-center py-5">
                                 <Spinner animation="border" variant="primary" />
                                 <p className="mt-3" style={{ color: '#718096' }}>מעבד את הבקשה...</p>
                              </div>
                           )}

                           {aiError && (
                              <Alert variant="danger" style={{ fontSize: '0.95rem' }}>
                                 {aiError}
                              </Alert>
                           )}

                           {aiResponse && !aiLoading && (
                              <div>
                                 <div className="mb-4 p-3 bg-light rounded border">
                                    <div className="text-primary font-bold mb-2" style={{ fontSize: '1.1rem' }}>
                                       💡 סיכום המערכת:
                                    </div>
                                    <div style={{ fontSize: '1rem', color: '#555', lineHeight: '1.7' }}>
                                       {aiResponse.summary}
                                    </div>
                                 </div>

                                 <div className="d-flex flex-column gap-3">
                                    {aiResponse.recommendations?.map((rec, index) => (
                                       <Card key={index} className="border-0 shadow-sm" 
                                          style={{ background: index === 0 ? '#f0f9ff' : 'white' }}>
                                          <Card.Body className="p-3">
                                             <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                   <FaUserTie className="text-secondary" size={20} />
                                                   <span className="font-bold text-dark" style={{ fontSize: '1.1rem' }}>
                                                      {rec.name}
                                                   </span>
                                                </div>
                                                <Badge bg={rec.score > 90 ? "success" : rec.score > 80 ? "info" : "warning"} 
                                                   pill style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                                   התאמה: {rec.score}%
                                                </Badge>
                                             </div>
                                             <div className="d-flex align-items-start gap-2">
                                                <FaCheckCircle className="text-success mt-1" style={{ minWidth: '18px' }} />
                                                <span style={{ fontSize: '1rem', color: '#444', lineHeight: '1.6' }}>
                                                   {rec.reason}
                                                </span>
                                             </div>
                                          </Card.Body>
                                       </Card>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </>
               )}
            </div>
         </Col>

        {/* עמודה ימנית - שליחת הודעות */}
<Col xs={12} md={12} lg={4}>
   <div className={styles.rightColumn}>
      <div className={styles.sectionTitle}>
         💬 שליחת הודעות
      </div>
      
      <div className={styles.messageCard}>
   {/* הוספנו בדיקה AllPrograms? כדי למנוע את שגיאת ה-undefined */}
   <SendMessagesBox 
      Inner_SelectedRows={SelectedRows} 
      LeftGridApi={LeftGridApi} 
      currentProgramData={AllPrograms?.find(p => p.Programid === CurrentProgram.value)}
   />
</div>
   </div>
</Col>

         {/* 🔥 CustomProgramModal מוסתר אבל פעיל - לשיבוץ מדריכים */}
         <div style={{ display: 'none' }}>
            <ProgramModal
               CurrentProgram={CurrentProgram}
               ChosenCandidate={ChosenCandidate}
               LeftGridApi={LeftGridApi}
               AllPrograms={AllPrograms}
               AllCandidates={AllCandidates}
               AllCandidates_Details={AllCandidates_Details}
               AllSchools={AllSchools}
               AllContacts={AllContacts}
               All_Assigned_Guides={All_Assigned_Guides}
               All_Assigned_Guides_Details={All_Assigned_Guides_Details}
               setAllAssignedGuides={setAllAssignedGuides}
               setAllAssignedGuides_Details={setAllAssignedGuides_Details}
               setAllCandidates={setAllCandidates}
               setAllCandidates_Details={setAllCandidates_Details}
               AllColorCandidates={AllColorCandidates}
               setAllColorCandidates={setAllColorCandidates}
            />
         </div>
      </Row>
   )
}