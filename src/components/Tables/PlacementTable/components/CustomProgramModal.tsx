"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Col, Container, Row } from "react-bootstrap";
import { Assigned_Guide, ColorCandidate, Guide, Guides_ToAssign, Program, Program_Schedule, School, SchoolsContact } from "@prisma/client";
import { getProgramSchedule, getProgramWithId, updateProgramsColumn } from "@/db/programsRequests";
import { getSchoolsByIds } from "@/db/schoolrequests";
import {
  addAssignedInstructors,
  deleteAssignedInstructor,
  getAllCandidates,
  getAllCandidatesByProgramID,
  getAssignedInstructorsByProgramID,
  getGuidesById,
  setColorCandidate, // *** לוודא שקיים import זה ***
  updateInstructorsColumn,
} from "@/db/instructorsrequest";
import Spinner from 'react-bootstrap/Spinner';
import { selectContacts } from "@/db/contactsRequests";
import { TiDelete } from "react-icons/ti";
import { GridApi } from "ag-grid-community";
import SendMessagesBox from "@/components/Tables/PlacementTable/components/SendMessages";
import { updateStorage } from "../Storage/PlacementDataStorage";

type Data = {
  CurrentProgram: { label: string; value: number },
  ChosenCandidate: { guide: Guide },
  LeftGridApi: GridApi<Guide>,
  AllPrograms: Program[],
  AllCandidates: Guides_ToAssign[],
  AllCandidates_Details: Guide[],
  AllSchools: School[],
  AllContacts: SchoolsContact[],
  All_Assigned_Guides: Assigned_Guide[],
  All_Assigned_Guides_Details: Guide[],
  setAllAssignedGuides: any,
  setAllAssignedGuides_Details: any,
  setAllCandidates_Details: any,
  setAllCandidates: any,
  // *** תוספת פרופס ***
  AllColorCandidates: ColorCandidate[],
  setAllColorCandidates: any
};

const TableNames: { [index: string]: any } = {
  Title: "כרטיסיית תוכניות",
  SchoolName: "בית ספר",
  SchoolGrade: "שכבה",
  Contact: "איש קשר",
  City: "יישוב",
  Weeks: "שבועות",
  Days: "ימים",
  ProgramName: "תוכנית",
  Guides: "מדריכים",
  AdditionalDetails: "פרטים",
};

const ProgramModal = ({ 
    setAllCandidates_Details, 
    setAllCandidates, 
    CurrentProgram, 
    ChosenCandidate, 
    LeftGridApi, 
    AllPrograms, 
    AllCandidates, 
    AllCandidates_Details, 
    AllSchools, 
    AllContacts, 
    All_Assigned_Guides, 
    All_Assigned_Guides_Details, 
    setAllAssignedGuides, 
    setAllAssignedGuides_Details,
    // *** קבלת הפרופס ***
    AllColorCandidates,
    setAllColorCandidates
}: Data) => {
  const [SchoolName, setSchoolName] = useState("");
  const [SchoolGrade, setSchoolGrade] = useState("");
  const [CityName, setCityName] = useState("");
  const [ContactList, setContact]: [SchoolsContact[], any] = useState([]);
  const [Weeks, setWeeks] = useState(0);
  const [Details, setDetails] = useState("");
  const [LoadData, setLoadData] = useState<{ guide: Guide, key: number }[]>()
  const [LinkProgram, setLinkProgram] = useState("")
  const [DaysChosen, setDays] = useState<string>("")


  const [Guide_1, setGuide_1] = useState<Guide>()
  const [Guide_2, setGuide_2] = useState<Guide>()
  const [Guide_3, setGuide_3] = useState<Guide>()
  const [Guide_4, setGuide_4] = useState<Guide>()
  const [Guide_5, setGuide_5] = useState<Guide>()
  const [Guide_6, setGuide_6] = useState<Guide>()
  const [Guide_7, setGuide_7] = useState<Guide>()
  const [Guide_8, setGuide_8] = useState<Guide>()
  const [Guide_9, setGuide_9] = useState<Guide>()
  const [Guide_10, setGuide_10] = useState<Guide>()

  const GuideMap = useCallback(() => {
    var map = new Map<number, React.Dispatch<React.SetStateAction<Guide>>>()
    map[1] = setGuide_1
    map[2] = setGuide_2
    map[3] = setGuide_3
    map[4] = setGuide_4
    map[5] = setGuide_5
    map[6] = setGuide_6
    map[7] = setGuide_7
    map[8] = setGuide_8
    map[9] = setGuide_9
    map[10] = setGuide_10
    return map
  }, [])

  const getGuidesMap = useCallback(() => {
    var map = new Map<number, Guide>()
    map[1] = Guide_1
    map[2] = Guide_2
    map[3] = Guide_3
    map[4] = Guide_4
    map[5] = Guide_5
    map[6] = Guide_6
    map[7] = Guide_7
    map[8] = Guide_8
    map[9] = Guide_9
    map[10] = Guide_10
    return map
  }, [Guide_1, Guide_2, Guide_3, Guide_4, Guide_5, Guide_6, Guide_7, Guide_8, Guide_9, Guide_10])

  const getRange = useCallback((start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [])

  // this will be activated when clicking on 'Add' to assigned guides.
  useEffect(() => {
    const updateGuides = () => {
      const all_numbers = getRange(1, 10)
      const map = getGuidesMap()
      var searchFlag = false
      for (const index of all_numbers) {
        const current_guide: Guide | null = map[index]
        if (current_guide && ChosenCandidate && ChosenCandidate.guide && current_guide.Objectid === ChosenCandidate.guide.Objectid) {
          searchFlag = true
          LeftGridApi.deselectAll()
          break
        }
      }

      if (searchFlag) {
        return
      }

      for (const index of all_numbers) {
        const current_guide: Guide | null = map[index]
        if (!current_guide) {
          const method: React.Dispatch<React.SetStateAction<Guide>> = GuideMap()[index]
          const row: Guide = ChosenCandidate.guide ? ChosenCandidate.guide : undefined
          method(row)
          var new_guide: Partial<Assigned_Guide> = { Guideid: row.Guideid, Programid: CurrentProgram.value }
          
          addAssignedInstructors(CurrentProgram.value, row.Guideid, new_guide).then((guide: Assigned_Guide) => {
            setAllAssignedGuides((arr: Assigned_Guide[]) => {
              return [...arr, guide]
            })
            setAllAssignedGuides_Details((arr: Guide[]) => [...arr, row])
            updateStorage({ AssignedGuides: [...All_Assigned_Guides, guide] })
            
            // *** שינוי: הגדרת צבע אפור בהיר בעת שיבוץ ***
            const GRAY_HEX = "#D3D3D3";
            setColorCandidate(row.Guideid, CurrentProgram.value, GRAY_HEX);
            
            setAllColorCandidates((prevColors: ColorCandidate[]) => {
                const exists = prevColors.find(c => c.Guideid === row.Guideid && c.Programid === CurrentProgram.value);
                let newColors;
                if (exists) {
                     newColors = prevColors.map(c => c.Guideid === row.Guideid && c.Programid === CurrentProgram.value ? { ...c, ColorHexCode: GRAY_HEX } : c);
                } else {
                     newColors = [...prevColors, { Guideid: row.Guideid, Programid: CurrentProgram.value, ColorHexCode: GRAY_HEX, id: -1 }];
                }
                updateStorage({ ColorCandidates: newColors });
                return newColors;
            });
          })
          
          updateInstructorsColumn("isAssigned", true, row.Guideid)
          const rowNode = LeftGridApi.getRowNode(row.Guideid.toString())
          rowNode.setDataValue("isAssigned", true)
          LeftGridApi.deselectAll()
          break
        }
      }
    }
    if (ChosenCandidate) {
      updateGuides()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ChosenCandidate])

  const resetGuides = useCallback(() => {
    const rn: number[] = getRange(1, 10)
    const map = GuideMap()
    for (const number of rn) {
      const method: React.Dispatch<React.SetStateAction<Guide>> = map[number]
      method(undefined)
    }
  }, [getRange, GuideMap])


  // this is deleting the assigned guide.
  const onClick = useCallback((event, key: number) => {
    const current_guide: Guide = getGuidesMap()[key]
    deleteAssignedInstructor(CurrentProgram.value, current_guide.Guideid)

    let new_list_assigned_guides: Assigned_Guide[] = []
    let new_list_assigned_guides_details: Guide[] = []
    for (let guide_s of All_Assigned_Guides) {
      if (guide_s.Guideid === current_guide.Guideid) {
        continue
      }
      new_list_assigned_guides.push(guide_s)
    }
    for (let guide_s of All_Assigned_Guides_Details) {
      if (guide_s.Guideid === current_guide.Guideid) {
        continue
      }
      new_list_assigned_guides_details.push(guide_s)
    }
    setAllAssignedGuides(new_list_assigned_guides ?? [])
    setAllAssignedGuides_Details(new_list_assigned_guides_details ?? [])
    updateStorage({ AssignedGuides: new_list_assigned_guides ?? [] })

    // *** שינוי: הגדרת צבע אדום בעת מחיקה/הסרה ***
    const RED_HEX = "#FF0000";
    setColorCandidate(current_guide.Guideid, CurrentProgram.value, RED_HEX);
    
    setAllColorCandidates((prevColors: ColorCandidate[]) => {
        const exists = prevColors.find(c => c.Guideid === current_guide.Guideid && c.Programid === CurrentProgram.value);
        let newColors;
        if (exists) {
             newColors = prevColors.map(c => c.Guideid === current_guide.Guideid && c.Programid === CurrentProgram.value ? { ...c, ColorHexCode: RED_HEX } : c);
        } else {
             newColors = [...prevColors, { Guideid: current_guide.Guideid, Programid: CurrentProgram.value, ColorHexCode: RED_HEX, id: -1 }];
        }
        updateStorage({ ColorCandidates: newColors });
        return newColors;
    });

    resetGuides()
    const rowNode = LeftGridApi.getRowNode(current_guide.Guideid.toString())

    rowNode.setDataValue("isAssigned", false)
    updateInstructorsColumn("isAssigned", false, current_guide.Guideid)

    LeftGridApi.onFilterChanged()
    LeftGridApi.deselectAll()

  }, [getGuidesMap, CurrentProgram.value, LeftGridApi, setAllAssignedGuides, setAllAssignedGuides_Details, resetGuides, All_Assigned_Guides, All_Assigned_Guides_Details, setAllColorCandidates])

  const getGuides = useCallback(() => {
    const Title: string = "מדריך"
    const map: Map<number, Guide> = getGuidesMap()
    const rn: number[] = getRange(1, 10)
    return (
      <Container>
        <Row className="g-4 flex-row-reverse">
          {rn.map((val) => {
            const guide: Guide = map[val]

            return (<Col md={3} key={val} hidden={guide ? false : true}>
              <Card>
                <Card.Body>
                  <Card.Title> {`${Title.concat('-', val.toString())}`}</Card.Title>
                  <div className=" float-right">
                    <button onClick={(event) => onClick(event, val)}> <TiDelete /> </button>
                  </div>
                  <a className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline" href={`whatsapp://send/?phone=972${guide?.CellPhone}`} target="_blank">{guide?.LastName ? guide?.FirstName?.concat('-', guide?.LastName) : guide?.FirstName} </a>
                </Card.Body>
              </Card>
            </Col>

            )
          })}

        </Row>
      </Container>
    )
  }, [getGuidesMap, getRange, onClick])


  useEffect(() => {
    const getData = () => {
      if (AllPrograms && AllSchools && AllContacts && AllCandidates && AllCandidates_Details) {
        const new_program: Program = AllPrograms.find((program) => program.Programid === CurrentProgram.value)
        const school: School = AllSchools.find((school) => school.Schoolid === new_program.Schoolid)
        const contacts_list: SchoolsContact[] = AllContacts.filter((contact) => contact.Schoolid === school.Schoolid)


        const Candidates = All_Assigned_Guides.filter((res) => res.Programid === new_program.Programid)

        const new_Candidates_ids = [...Candidates.map((res) => res.Guideid)]
        const Candidates_Details = All_Assigned_Guides_Details.filter((res) => new_Candidates_ids.includes(res.Guideid))

        setSchoolName(school.SchoolName);
        setSchoolGrade(school.EducationStage);
        setCityName(school.City);
        setDetails(new_program.Details);
        setWeeks(new_program.Weeks);
        setContact(contacts_list)
        setLinkProgram(new_program.ProgramLink)
        setDays(new_program.ChosenDay)

        var guide_list = []
        var index = 1

        for (const guide_detail of Candidates_Details) {
          const Guide_Detail: Guide = guide_detail
          const method: React.Dispatch<React.SetStateAction<Guide>> = GuideMap()[index]
          guide_list.push({ guide: Guide_Detail, key: index })
          index += 1
          method(Guide_Detail)

        }
        for (let l = index; index <= 10; index++) {
          const method: React.Dispatch<React.SetStateAction<Guide>> = GuideMap()[index]
          guide_list.push({ guide: undefined, key: index })
          method(undefined)
        }

        setLoadData(guide_list)
      }

    }
    if (!(CurrentProgram.value === -1)) {
      getData()
    }

  }, [GuideMap, CurrentProgram, AllPrograms, AllSchools, AllContacts, AllCandidates, AllCandidates_Details, All_Assigned_Guides, All_Assigned_Guides_Details]);
  const getContacts = useCallback(() => {
    return ContactList.map((val: SchoolsContact) => (
      <div className="w-[200px]" key={val.Contactid}>
        <a href={`whatsapp://send/?phone=972${val?.Cellphone}`}>{val.FirstName.concat(" ", val.Role, " ")}</a>
      </div>
    ));
  }, [ContactList]);
  return (


    <Card border="light" className="text-right w-[36rem]">
      <Card.Header>{TableNames["Title"]}</Card.Header>
      <Row className="mt-4">
        <Col xs={{ order: 3 }}>
          <Card.Subtitle>
            {" "}
            <div className="font-bold">{TableNames["SchoolName"]} </div>
            <Card.Body>{SchoolName} </Card.Body>
          </Card.Subtitle>
          <Card.Subtitle>
            {" "}
            <div className="font-bold"> {TableNames["SchoolGrade"]} </div>
            <Card.Body> {SchoolGrade} </Card.Body>
          </Card.Subtitle>
        </Col>

        <Col xs={{ order: 2 }}>
          <Card.Subtitle>
            {" "}
            <div className="font-bold">{TableNames["City"]} </div>
            <Card.Body>{CityName} </Card.Body>
          </Card.Subtitle>
          <Card.Subtitle>
            {" "}
            <div className="font-bold w-100"> {TableNames["Contact"]} </div>

            {getContacts()}

          </Card.Subtitle>
        </Col>

        <Col xs={{ order: 1 }}>
          <Card.Subtitle>
            {" "}
            <div className="font-bold">{TableNames["ProgramName"]} </div>
            <Card.Body> <a href={LinkProgram}> {CurrentProgram.label}  </a></Card.Body>
          </Card.Subtitle>
          <Card.Subtitle>
            {" "}
            <div className="font-bold"> {TableNames["Weeks"]} </div>
            <Card.Body> {Weeks} </Card.Body>
          </Card.Subtitle>
        </Col>

        <Col>
          <Card.Subtitle>
            {" "}
            <div className="font-bold">{TableNames["Days"]} </div>
            <Card.Body> {DaysChosen}</Card.Body>
          </Card.Subtitle>
        </Col>
      </Row>
      <Card.Subtitle>
        {" "}
        <div className="font-bold">{TableNames["Guides"]} </div>
        <Card.Body>{getGuides()} </Card.Body>
      </Card.Subtitle>
      <Row></Row>
      <Card.Subtitle>
        {" "}
        <div className="font-bold">{TableNames["AdditionalDetails"]} </div>
        <Card.Body> {Details} </Card.Body>
      </Card.Subtitle>

      <Row>

      </Row>
    </Card>

  );
};

export default ProgramModal;