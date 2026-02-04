import { useMemo, useEffect } from "react";
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
      
      console.log("🔍 Found Program:", program);
      return program;
   }, [AllPrograms, CurrentProgram.value]);

   const currentSchool = useMemo(() => {
      if (!currentProgramData || !AllSchools || AllSchools.length === 0) return null;
      
      let school = AllSchools.find(s => s.Schoolid === currentProgramData.Schoolid);
      if (!school && (currentProgramData as any).schoolId) {
         school = AllSchools.find(s => s.Schoolid === (currentProgramData as any).schoolId);
      }
      if (!school && (currentProgramData as any).school_id) {
         school = AllSchools.find(s => s.Schoolid === (currentProgramData as any).school_id);
      }
      
      console.log("🏫 Found School:", school);
      return school;
   }, [AllSchools, currentProgramData]);

   const displayedGuides = useMemo(() => {
      if (!All_Assigned_Guides || !All_Assigned_Guides_Details || CurrentProgram.value === -1) {
         return [];
      }
      
      const currentProgramGuideIds = All_Assigned_Guides
         .filter(ag => ag.Programid === CurrentProgram.value)
         .map(ag => ag.Guideid);
      
      const guidesForCurrentProgram = All_Assigned_Guides_Details.filter(guide => 
         currentProgramGuideIds.includes(guide.Guideid)
      );
      
      console.log("👥 Displaying Guides:", guidesForCurrentProgram);
      return guidesForCurrentProgram;
   }, [All_Assigned_Guides, All_Assigned_Guides_Details, CurrentProgram.value]);

   useEffect(() => {
      if (currentProgramData) {
         console.log("📊 ProgramDetails - Current Program:", currentProgramData);
         console.log("📊 ProgramDetails - Current School:", currentSchool);
         console.log("📊 ProgramDetails - Assigned Guides:", displayedGuides);
      }
   }, [currentProgramData, currentSchool, displayedGuides]);

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

   // 🔥 שימוש בשדות הנכונים מהבסיס נתונים
   const programName = CurrentProgram.label || currentProgramData.ProgramName || "לא צוין";
   const schoolName = currentSchool?.SchoolName || currentSchool?.name || "לא צוין";
   const grade = currentProgramData.Grade || currentSchool?.EducationStage || "לא צוין";
   const city = currentProgramData.CityName || currentSchool?.City || "לא צוין";
   const district = currentProgramData.District || "לא צוין";
   const weeksNumber = currentProgramData.WeeksNumber || currentProgramData.Weeks || "לא צוין";

   return (
      <div className={styles.programDetailsContainer}>
         <div className={styles.cardInnerTitle}>כרטיסיית תוכניות</div>
         
         <div className={styles.programCardGrid}>
            <div className={styles.programCardColumn}>
               <div className={styles.programCardItem}>
                  <span className={styles.itemIcon}>📘</span>
                  <span className={styles.itemLabelText}>תוכנית</span>
                  <span className={styles.itemSeparator}>:</span>
                  <span className={styles.itemValue}>{programName}</span>
               </div>
               <div className={styles.programCardItem}>
                  <span className={styles.itemIcon}>🎓</span>
                  <span className={styles.itemLabelText}>שכבה</span>
                  <span className={styles.itemSeparator}>:</span>
                  <span className={styles.itemValue}>{grade}</span>
               </div>
               <div className={styles.programCardItem}>
                  <span className={styles.itemIcon}>🏠</span>
                  <span className={styles.itemLabelText}>יישוב</span>
                  <span className={styles.itemSeparator}>:</span>
                  <span className={styles.itemValue}>{city}</span>
               </div>
            </div>

            <div className={styles.programCardColumn}>
               <div className={styles.programCardItem}>
                  <span className={styles.itemIcon}>📅</span>
                  <span className={styles.itemLabelText}>שבועות</span>
                  <span className={styles.itemSeparator}>:</span>
                  <span className={styles.itemValue}>{weeksNumber}</span>
               </div>
               <div className={styles.programCardItem}>
                  <span className={styles.itemIcon}>📍</span>
                  <span className={styles.itemLabelText}>אזור</span>
                  <span className={styles.itemSeparator}>:</span>
                  <span className={styles.itemValue}>{district}</span>
               </div>
            </div>
         </div>

         {/* 🔥 סקציית מדריכים - המספר עכשיו מימין */}
         <div className={styles.guidesSection}>
            <div className={styles.guidesSectionTitle}>מדריכים</div>
            {displayedGuides.length > 0 ? (
               <div className={styles.assignedGuidesInline}>
                  {displayedGuides.map((guide, index) => (
                     <div key={guide.Guideid || index} className={styles.guideItemInline}>
                        {/* 🔥 המספר - מימין */}
                        <span className={styles.guideBadgeInline}>{index + 1}</span>
                        
                        {/* 🔥 השם - באמצע */}
                        <span className={styles.guideNameInline}>
                           {guide.FirstName} {guide.LastName}
                        </span>
                        
                        {/* 🔥 כפתור X - משמאל */}
                        {onRemoveGuide && (
                           <button 
                              className={styles.removeGuideButton}
                              onClick={() => handleRemoveClick(guide.Guideid)}
                              title="הסר מדריך"
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

         <div className={styles.detailsSection}>
            <div className={styles.detailsSectionTitle}>פרטים</div>
            <div className={styles.detailsContent}>
               {currentProgramData.Details || currentProgramData.Notes || "אין פרטים נוספים"}
            </div>
         </div>
      </div>
   );
};