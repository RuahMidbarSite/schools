import { useMemo } from "react";
import { Program, School, Guide } from "@prisma/client";
import styles from "./ProgramModule.module.css";

type ProgramDetailsProps = {
   CurrentProgram: { label: string, value: number };
   AllPrograms: Program[];
   AllSchools: School[];
   All_Assigned_Guides_Details: Guide[];
   All_Assigned_Guides: any[];
   onRemoveGuide?: (guideId: number) => void;
}

export const ProgramDetails = ({
   CurrentProgram,
   AllPrograms,
   AllSchools,
   All_Assigned_Guides_Details,
   All_Assigned_Guides,
   onRemoveGuide
}: ProgramDetailsProps) => {
   
   const currentProgramData = useMemo(() => {
      if (!AllPrograms || AllPrograms.length === 0 || CurrentProgram.value === -1) return null;
      
      let program = AllPrograms.find(p => p.Programid === CurrentProgram.value);
      if (!program) {
         program = AllPrograms.find(p => (p as any).id === CurrentProgram.value);
      }
      return program;
   }, [AllPrograms, CurrentProgram.value]);

   const currentSchool = useMemo(() => {
      if (!currentProgramData || !AllSchools || AllSchools.length === 0) return null;
      
      let school = AllSchools.find(s => s.Schoolid === currentProgramData.Schoolid);
      if (!school && (currentProgramData as any).schoolId) {
         school = AllSchools.find(s => s.Schoolid === (currentProgramData as any).schoolId);
      }
      return school;
   }, [AllSchools, currentProgramData]);

   const displayedGuides = useMemo(() => {
      if (!All_Assigned_Guides || !All_Assigned_Guides_Details || CurrentProgram.value === -1) {
         return [];
      }
      
      const currentProgramGuideIds = All_Assigned_Guides
         .filter(ag => ag.Programid === CurrentProgram.value)
         .map(ag => ag.Guideid);
      
      return All_Assigned_Guides_Details.filter(guide => 
         currentProgramGuideIds.includes(guide.Guideid)
      );
   }, [All_Assigned_Guides, All_Assigned_Guides_Details, CurrentProgram.value]);

   const handleRemoveClick = (guideId: number) => {
      if (onRemoveGuide && window.confirm("האם אתה בטוח שברצונך להסיר את המדריך משיבוץ זה?")) {
         onRemoveGuide(guideId);
      }
   };

   if (!currentProgramData) {
      return (
         <div className={styles.noProgramSelected}>
            <div className={styles.noProgramIcon}>📋</div>
            <div className={styles.noProgramText}>לא נבחרה תוכנית</div>
         </div>
      );
   }

   return (
      <div className={styles.programDetailsContainer}>
         {/* קופסה 1 - פרטי התוכנית */}
         <div className={styles.programInfoBox}>
            <div className={styles.cardInnerTitle}>כרטיסיית תוכניות</div>
            
            <div className={styles.programCardGrid}>
               {/* טור 1 */}
               <div className={styles.programCardColumn}>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>📘</span>
                     <span className={styles.itemLabelText}>תוכנית</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>
                        {currentProgramData.ProgramLink && currentProgramData.ProgramLink !== "" ? (
                           <a 
                              href={currentProgramData.ProgramLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                 color: '#007bff', 
                                 textDecoration: 'none',
                                 fontWeight: '600'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                           >
                              {currentProgramData.ProgramName || "לא צוין"}
                           </a>
                        ) : (
                           currentProgramData.ProgramName || "לא צוין"
                        )}
                     </span>
                  </div>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>📄</span>
                     <span className={styles.itemLabelText}>הצעה</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>
                        {currentProgramData.Proposal && currentProgramData.Proposal !== "" ? (
                           <a 
                              href={currentProgramData.Proposal} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                 color: '#007bff', 
                                 textDecoration: 'none',
                                 fontWeight: '600'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                           >
                              הצעה
                           </a>
                        ) : (
                           "לא צוין"
                        )}
                     </span>
                  </div>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>🏠</span>
                     <span className={styles.itemLabelText}>יישוב</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>{currentProgramData.CityName || "לא צוין"}</span>
                  </div>
               </div>

               {/* טור 2 */}
               <div className={styles.programCardColumn}>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>⏰</span>
                     <span className={styles.itemLabelText}>שיעורים ביום</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>{currentProgramData.LessonsPerDay || "לא צוין"}</span>
                  </div>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>🎓</span>
                     <span className={styles.itemLabelText}>שכבה</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>{currentProgramData.Grade || "לא צוין"}</span>
                  </div>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>📍</span>
                     <span className={styles.itemLabelText}>אזור</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>{currentProgramData.District || "לא צוין"}</span>
                  </div>
               </div>

               {/* טור 3 */}
               <div className={styles.programCardColumn}>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>🗓️</span>
                     <span className={styles.itemLabelText}>תאריך התחלה</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>
                        {currentProgramData.Date 
                           ? new Date(currentProgramData.Date).toLocaleDateString('he-IL') 
                           : "לא צוין"}
                     </span>
                  </div>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>📆</span>
                     <span className={styles.itemLabelText}>ימים</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>{currentProgramData.Days || "לא צוין"}</span>
                  </div>
                  <div className={styles.programCardItem}>
                     <span className={styles.itemIcon}>📅</span>
                     <span className={styles.itemLabelText}>שבועות</span>
                     <span className={styles.itemSeparator}>:</span>
                     <span className={styles.itemValue}>{currentProgramData.Weeks || "לא צוין"}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* קופסה 2 - מדריכים */}
         <div className={styles.programInfoBox}>
            <div className={styles.guidesSectionTitle}>מדריכים</div>
            {displayedGuides.length > 0 ? (
               <div className={styles.assignedGuidesInline} style={{ flexDirection: 'column', gap: '8px' }}>
                  {displayedGuides.map((guide, index) => (
                     <div key={guide.Guideid || index} className={styles.guideItemInline} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', textAlign: 'right', direction: 'rtl' }}>
                        
                        <div style={{ display: 'flex', gap: '15px', flex: 1, alignItems: 'flex-start' }}>
                           
                           {/* אזור השם והמספר */}
                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginTop: '2px' }}>
                              <span className={styles.guideBadgeInline}>{index + 1}</span>
                              <span className={styles.guideNameInline} style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                 {guide.FirstName} {guide.LastName}
                              </span>
                           </div>

                           {/* אזור שורות הפירוט */}
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, marginTop: '4px' }}>
                              
                              {/* שורה 1: טלפון, עיר וכו' */}
                              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', flexWrap: 'wrap', fontSize: '0.9rem', color: '#4a5568' }}>
                                 {guide.CellPhone && <span><strong>טלפון:</strong> <a href={`whatsapp://send/?phone=972${guide.CellPhone}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#3182ce' }}>{guide.CellPhone}</a></span>}
                                 {guide.City && <span><strong>עיר:</strong> {guide.City}</span>}
                                 {guide.Area && <span><strong>אזור:</strong> {guide.Area}</span>}
                                 {guide.ReligiousSector && <span><strong>מגזר:</strong> {guide.ReligiousSector}</span>}
                                 {guide.CV && <span><strong>קו"ח:</strong> <a href={guide.CV} target="_blank" rel="noreferrer" style={{ color: '#3182ce', textDecoration: 'underline' }}>לצפייה</a></span>}
                              </div>

                              {/* שורה 2: מקצועות, הערות */}
                              {(guide.Professions || guide.Notes) && (
                                 <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '15px', flexWrap: 'wrap', fontSize: '0.9rem', color: '#4a5568' }}>
                                    {guide.Professions && <span><strong>מקצועות:</strong> {guide.Professions}</span>}
                                    {guide.Notes && <span><strong>הערות:</strong> {guide.Notes}</span>}
                                 </div>
                              )}
                              
                           </div>
                        </div>

                        {/* כפתור מחיקה */}
                        {onRemoveGuide && (
                           <button 
                              className={styles.removeGuideButton}
                              onClick={() => handleRemoveClick(guide.Guideid)}
                              title="הסר מדריך משיבוץ"
                              style={{ marginTop: '4px', marginRight: '15px', flexShrink: 0 }}
                           >
                              ✖
                           </button>
                        )}
                        
                     </div>
                  ))}
               </div>
            ) : (
               <div className={styles.noGuidesText}>אין מדריכים משובצים</div>
            )}
         </div>

         {/* קופסה 3 - פרטים */}
         <div className={styles.programInfoBox}>
            <div className={styles.detailsSectionTitle}>פרטים</div>
            <div className={styles.detailsContent}>
               {currentProgramData.Details || currentProgramData.Notes || "אין פרטים נוספים"}
            </div>
         </div>
      </div>
   );
};