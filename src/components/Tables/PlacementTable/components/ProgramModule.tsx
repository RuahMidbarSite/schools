

import { useEffect, useMemo, useState } from "react";
import { Button, Col, Container, ListGroup, OverlayTrigger, Row, Spinner, Tooltip } from "react-bootstrap";
import ProgramModal from "./CustomProgramModal";
import CustomSelectNoComp from "./CustomSelectNoComp";
import { AssignGuides } from "./AssignGuides";
import { Assigned_Guide, Guide, Guides_ToAssign, Program, School, SchoolsContact, StatusPrograms, Years } from "@prisma/client";
import { GridApi } from "ag-grid-community";
import SendMessagesBox from "@/components/Tables/PlacementTable/components/SendMessages";
import YearSelect from "@/components/Tables/PlacementTable/components/YearSelect";
import StatusSelect from "@/components/Tables/PlacementTable/components/StatusSelect";
import { useYear } from "@/context/YearContext";
import { useStatus } from "@/context/StatusContext";

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
   setAllCandidates_Details:any,
   setAllCandidates:any

}
export const ProgramModule = ({ setAllCandidates_Details,setAllCandidates,CurrentProgram, setCurrentProgram, LeftGridApi, RightGridApi, SelectedRows, setAssigned_guides, AllPrograms, AllCandidates, AllCandidates_Details, AllSchools, AllContacts, All_Assigned_Guides, All_Assigned_Guides_Details, setAllAssignedGuides, setAllAssignedGuides_Details, AllYears, AllStatuses }: ProgramProps) => {

   const [currentProgram, setCurrentProgram_inner] = useState(CurrentProgram)

   //    // You change this in AssignedGuides and react to it in ProgramModal.
   const [ChosenCandidate, setChosenCandidate] = useState<{ guide: Guide }>()



   const [Inner_SelectedRows, setInnerRows] = useState(SelectedRows)
   const selectedYear = useYear().selectedYear
   const defaultStatus = useStatus().defaultStatus

   const [FilterYear, setFilterYear] = useState<{ label: string, value: any }>({ label: selectedYear ? selectedYear : "הכל", value: selectedYear ? selectedYear : undefined })


   const [FilterStatus, setFilterStatus] = useState<{ label: string, value: any }>({ label: defaultStatus ? defaultStatus : "הכל", value: defaultStatus ? defaultStatus : undefined })

   useEffect(() => {
      const updatePlacementProgram = () => {
         if (currentProgram.value !== CurrentProgram.value) {
            setCurrentProgram(currentProgram)
         }

      }
      updatePlacementProgram()
   }, [CurrentProgram, currentProgram, setCurrentProgram])


   useEffect(() => {
      setInnerRows(SelectedRows)

   }, [SelectedRows])

   const TitleMessage = useMemo(() => "שלח הודעה למועמדים", [])
   return (
      <>

         <Row >
            <Col className="" lg={{ order: 'last', span: '2', offset: '1' }} >
               <div className='text-right font-bold'>
                  {TitleMessage}
               </div>
               <SendMessagesBox Inner_SelectedRows={Inner_SelectedRows} LeftGridApi={LeftGridApi} />

            </Col>

            <Col xs md lg="auto">
               <ProgramModal CurrentProgram={currentProgram} ChosenCandidate={ChosenCandidate} LeftGridApi={LeftGridApi} AllPrograms={AllPrograms} AllCandidates={AllCandidates} AllCandidates_Details={AllCandidates_Details} AllSchools={AllSchools} AllContacts={AllContacts} All_Assigned_Guides={All_Assigned_Guides} All_Assigned_Guides_Details={All_Assigned_Guides_Details}
  setAllAssignedGuides={setAllAssignedGuides} setAllAssignedGuides_Details={setAllAssignedGuides_Details} setAllCandidates={setAllCandidates} setAllCandidates_Details={setAllCandidates_Details}  />
            </Col>
         </Row>
         <Row >
            <Col xs md lg={{ order: 1, span: '1' }} >

               <AssignGuides CurrentProgram={currentProgram} LeftGridApi={LeftGridApi} setChosenCandidate={setChosenCandidate} setAllAssignedGuides={setAllAssignedGuides} setAllAssignedGuides_Details={setAllAssignedGuides_Details}  />
            </Col>

            <Col xs md lg={{ order: 2, span: '1', offset: '6' }}  >
               <h5 className="font-bold rtl text-center"> בחירת תוכנית</h5>

               <CustomSelectNoComp placeholder={"בחר תוכנית"} setProgram={setCurrentProgram_inner} rightApi={RightGridApi} AllPrograms={AllPrograms} FilterYear={FilterYear} FilterStatus={FilterStatus} />
            </Col>

            <Col xs md lg={{ order: 3, span: '1', }} className="ml-10">
               <h5 className="font-bold rtl text-center"> בחירת סטטוס</h5>

               <StatusSelect placeholder={"בחר סטטוס"} AllStatuses={AllStatuses} setFilterStatus={setFilterStatus} />
            </Col>
            <Col xs md lg={{ order: 'last', span: '1', }} className="ml-10" >
               <h5 className="font-bold text-center rtl  "> בחירת שנה</h5>

               <YearSelect placeholder={"בחר שנה"} AllYears={AllYears} setFilterYear={setFilterYear} />
            </Col>


         </Row>

         <Row>

         </Row>


      </>
   )

}