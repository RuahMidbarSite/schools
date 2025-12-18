import { useMemo, useState } from "react";
import { Col, Row } from "react-bootstrap";
import ProgramModal from "./CustomProgramModal";
import { AssignGuides } from "./AssignGuides";
import { Assigned_Guide, ColorCandidate, Guide, Guides_ToAssign, Program, School, SchoolsContact, StatusPrograms, Years } from "@prisma/client";
import { GridApi } from "ag-grid-community";
import SendMessagesBox from "@/components/Tables/PlacementTable/components/SendMessages";

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
   // *** תוספות חדשות: העברת נתוני הצבעים ***
   AllColorCandidates: ColorCandidate[],
   setAllColorCandidates: any
}

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
   // *** קבלת הפרופס ***
   AllColorCandidates,
   setAllColorCandidates
}: ProgramProps) => {

   // State לשיבוץ המועמד
   const [ChosenCandidate, setChosenCandidate] = useState<{ guide: Guide }>()

   const TitleMessage = useMemo(() => "שלח הודעה למועמדים", [])

   return (
      <>
         <Row>
            <Col className="pr-4" lg={{ order: 'last', span: '3' }} >
               <div className='text-right font-bold'>
                  {TitleMessage}
               </div>
               <SendMessagesBox Inner_SelectedRows={SelectedRows} LeftGridApi={LeftGridApi} />
            </Col>

            {/* המודל המציג את פרטי התוכנית/בית הספר */}
            <Col xs md lg="auto">
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
                  // *** העברת הפרופס למודל ***
                  AllColorCandidates={AllColorCandidates}
                  setAllColorCandidates={setAllColorCandidates}
               />
            </Col>
         </Row>

         <Row>
            {/* כפתור השיבוץ */}
            <Col xs md lg={{ order: 1, span: '1' }} >
               <AssignGuides
                  CurrentProgram={CurrentProgram}
                  LeftGridApi={LeftGridApi}
                  setChosenCandidate={setChosenCandidate}
                  setAllAssignedGuides={setAllAssignedGuides}
                  setAllAssignedGuides_Details={setAllAssignedGuides_Details}
               />
            </Col>
         </Row>
      </>
   )
}