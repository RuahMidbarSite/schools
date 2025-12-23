"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Card, Col, Container, Row } from "react-bootstrap";
import { Assigned_Guide, ColorCandidate, Guide, Guides_ToAssign, Program, School, SchoolsContact } from "@prisma/client";
import {
  addAssignedInstructors,
  deleteAssignedInstructor,
  setColorCandidate,
  updateInstructorsColumn,
} from "@/db/instructorsrequest";
import { updateStorage } from "../Storage/PlacementDataStorage";
import { TiDelete } from "react-icons/ti";
import { GridApi } from "ag-grid-community";

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
  AllColorCandidates: ColorCandidate[],
  setAllColorCandidates: any
};

const TableNames: { [index: string]: any } = {
  Title: "כרטיסיית תוכניות",
  SchoolName: "בית ספר",
  SchoolGrade: "שכבה",
  Contact: "איש קשר",
  City: "יישוב",
  Area: "אזור", // הוספת שדה אזור
  Weeks: "שבועות",
  Days: "ימים",
  ProgramName: "תוכנית",
  Guides: "מדריכים",
  AdditionalDetails: "פרטים",
};

const CustomProgramModal = ({
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
  AllColorCandidates,
  setAllColorCandidates
}: Data) => {
  const [SchoolName, setSchoolName] = useState("");
  const [SchoolGrade, setSchoolGrade] = useState("");
  const [CityName, setCityName] = useState("");
  const [District, setDistrict] = useState(""); // State לאזור
  const [ContactList, setContact] = useState<SchoolsContact[]>([]);
  const [Weeks, setWeeks] = useState(0);
  const [Details, setDetails] = useState("");
  const [LoadData, setLoadData] = useState<{ guide: Guide, key: number }[]>();
  const [LinkProgram, setLinkProgram] = useState("");
  const [DaysChosen, setDays] = useState<string>("");

  const [Guide_1, setGuide_1] = useState<Guide>();
  const [Guide_2, setGuide_2] = useState<Guide>();
  const [Guide_3, setGuide_3] = useState<Guide>();
  const [Guide_4, setGuide_4] = useState<Guide>();
  const [Guide_5, setGuide_5] = useState<Guide>();
  const [Guide_6, setGuide_6] = useState<Guide>();
  const [Guide_7, setGuide_7] = useState<Guide>();
  const [Guide_8, setGuide_8] = useState<Guide>();
  const [Guide_9, setGuide_9] = useState<Guide>();
  const [Guide_10, setGuide_10] = useState<Guide>();

  const GuideMap = useCallback(() => {
    var map = new Map<number, React.Dispatch<React.SetStateAction<Guide>>>();
    map[1] = setGuide_1; map[2] = setGuide_2; map[3] = setGuide_3; map[4] = setGuide_4; map[5] = setGuide_5;
    map[6] = setGuide_6; map[7] = setGuide_7; map[8] = setGuide_8; map[9] = setGuide_9; map[10] = setGuide_10;
    return map;
  }, []);

  const getGuidesMap = useCallback(() => {
    var map = new Map<number, Guide>();
    map[1] = Guide_1; map[2] = Guide_2; map[3] = Guide_3; map[4] = Guide_4; map[5] = Guide_5;
    map[6] = Guide_6; map[7] = Guide_7; map[8] = Guide_8; map[9] = Guide_9; map[10] = Guide_10;
    return map;
  }, [Guide_1, Guide_2, Guide_3, Guide_4, Guide_5, Guide_6, Guide_7, Guide_8, Guide_9, Guide_10]);

  const getRange = useCallback((start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  useEffect(() => {
    const updateGuides = () => {
      const all_numbers = getRange(1, 10);
      const map = getGuidesMap();
      var searchFlag = false;
      
      for (const index of all_numbers) {
        const current_guide: Guide | null = map[index];
        if (current_guide && ChosenCandidate && ChosenCandidate.guide && current_guide.Guideid === ChosenCandidate.guide.Guideid) {
          searchFlag = true;
          LeftGridApi.deselectAll();
          break;
        }
      }

      if (searchFlag) return;

      for (const index of all_numbers) {
        const current_guide: Guide | null = map[index];
        if (!current_guide) {
          const method: React.Dispatch<React.SetStateAction<Guide>> = GuideMap()[index];
          const row: Guide = ChosenCandidate.guide ? ChosenCandidate.guide : undefined;
          
          if (!row) return; 

          method(row);
          var new_guide: Partial<Assigned_Guide> = { Guideid: row.Guideid, Programid: CurrentProgram.value };

          addAssignedInstructors(CurrentProgram.value, row.Guideid, new_guide).then((guide: Assigned_Guide) => {
            setAllAssignedGuides((arr: Assigned_Guide[]) => [...arr, guide]);
            setAllAssignedGuides_Details((arr: Guide[]) => [...arr, row]);
            updateStorage({ AssignedGuides: [...All_Assigned_Guides, guide] });

            const GRAY_HEX = "#D3D3D3";
            setColorCandidate(row.Guideid, CurrentProgram.value, GRAY_HEX);

            setAllColorCandidates((prevColors: ColorCandidate[]) => {
              const exists = prevColors.find(c => c.Guideid === row.Guideid && c.Programid === CurrentProgram.value);
              let newColors = exists 
                ? prevColors.map(c => c.Guideid === row.Guideid && c.Programid === CurrentProgram.value ? { ...c, ColorHexCode: GRAY_HEX } : c) 
                : [...prevColors, { Guideid: row.Guideid, Programid: CurrentProgram.value, ColorHexCode: GRAY_HEX, id: -1 }];
              updateStorage({ ColorCandidates: newColors });
              return newColors;
            });
          });

          updateInstructorsColumn("isAssigned", true, row.Guideid);
          const rowNode = LeftGridApi.getRowNode(row.Guideid.toString());
          if (rowNode) rowNode.setDataValue("isAssigned", true);
          
          LeftGridApi.deselectAll();
          break;
        }
      }
    };

    if (ChosenCandidate) updateGuides();
  }, [ChosenCandidate]);

  const resetGuides = useCallback(() => {
    const rn: number[] = getRange(1, 10);
    const map = GuideMap();
    for (const number of rn) { map[number](undefined); }
  }, [getRange, GuideMap]);

  const onClick = useCallback((event, key: number) => {
    const current_guide: Guide = getGuidesMap()[key];
    if (!current_guide) return;

    deleteAssignedInstructor(CurrentProgram.value, current_guide.Guideid);

    let new_list_assigned_guides = All_Assigned_Guides.filter(g => g.Guideid !== current_guide.Guideid);
    let new_list_assigned_guides_details = All_Assigned_Guides_Details.filter(g => g.Guideid !== current_guide.Guideid);

    setAllAssignedGuides(new_list_assigned_guides ?? []);
    setAllAssignedGuides_Details(new_list_assigned_guides_details ?? []);
    updateStorage({ AssignedGuides: new_list_assigned_guides ?? [] });

    const RED_HEX = "#FF0000";
    setColorCandidate(current_guide.Guideid, CurrentProgram.value, RED_HEX);

    setAllColorCandidates((prevColors: ColorCandidate[]) => {
      const exists = prevColors.find(c => c.Guideid === current_guide.Guideid && c.Programid === CurrentProgram.value);
      let newColors = exists 
        ? prevColors.map(c => c.Guideid === current_guide.Guideid && c.Programid === CurrentProgram.value ? { ...c, ColorHexCode: RED_HEX } : c) 
        : [...prevColors, { Guideid: current_guide.Guideid, Programid: CurrentProgram.value, ColorHexCode: RED_HEX, id: -1 }];
      updateStorage({ ColorCandidates: newColors });
      return newColors;
    });

    const map = GuideMap();
    map[key](undefined);
    
    const rowNode = LeftGridApi.getRowNode(current_guide.Guideid.toString());
    if (rowNode) rowNode.setDataValue("isAssigned", false);
    
    updateInstructorsColumn("isAssigned", false, current_guide.Guideid);
    LeftGridApi.onFilterChanged();
    LeftGridApi.deselectAll();

  }, [getGuidesMap, CurrentProgram.value, LeftGridApi, setAllAssignedGuides, setAllAssignedGuides_Details, All_Assigned_Guides, All_Assigned_Guides_Details, setAllColorCandidates, GuideMap]);

  const getGuides = useCallback(() => {
    const map: Map<number, Guide> = getGuidesMap();
    const rn: number[] = getRange(1, 10);
    return (
      <Container className="p-0">
        <Row className="g-2 flex-row-reverse"> 
          {rn.map((val) => {
            const guide: Guide = map[val];
            if (!guide) return null;
            return (
              <Col md="auto" key={val}>
                <Card style={{ width: 'fit-content' }}>
                  <Card.Body className="p-2 d-flex flex-row-reverse align-items-center gap-2"> 
                    <span className="font-weight-bold" style={{color: 'black'}}>{val}.</span>
                    <a className="font-medium text-blue-600 no-underline" href={`whatsapp://send/?phone=972${guide?.CellPhone}`} target="_blank">
                        {guide.FirstName} {guide.LastName}
                    </a>
                    <button onClick={(event) => onClick(event, val)} style={{ border: 'none', background: 'transparent' }}>
                         <TiDelete size={20} color="#dc3545" /> 
                    </button>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Container>
    );
  }, [getGuidesMap, getRange, onClick]);

  useEffect(() => {
    const getData = () => {
      if (AllPrograms && AllSchools && AllContacts && AllCandidates && AllCandidates_Details) {
        const new_program: Program = AllPrograms.find((program) => program.Programid === CurrentProgram.value);
        if (!new_program) return;
        
        const school: School = AllSchools.find((school) => school.Schoolid === new_program.Schoolid);
        const contacts_list: SchoolsContact[] = AllContacts.filter((contact) => contact.Schoolid === school.Schoolid);

        const Candidates = All_Assigned_Guides.filter((res) => res.Programid === new_program.Programid);
        const Candidates_Details: Guide[] = Candidates.map((c) => {
            let found = All_Assigned_Guides_Details.find(g => g.Guideid === c.Guideid);
            return found || AllCandidates_Details.find(g => g.Guideid === c.Guideid);
        }).filter((item): item is Guide => item !== undefined);

        setSchoolName(school.SchoolName);
        setSchoolGrade(school.EducationStage);
        setCityName(school.City);
        setDistrict(new_program.District || ""); // שליפת האזור
        setDetails(new_program.Details);
        setWeeks(new_program.Weeks);
        setContact(contacts_list);
        setLinkProgram(new_program.ProgramLink);
        setDays(new_program.ChosenDay);

        resetGuides();
        Candidates_Details.forEach((guide, i) => {
          if (i < 10) GuideMap()[i+1](guide);
        });
      }
    };
    if (CurrentProgram.value !== -1) getData();
  }, [CurrentProgram.value, AllPrograms, AllSchools, AllContacts, All_Assigned_Guides, All_Assigned_Guides_Details, resetGuides, GuideMap]);

  return (
    <Card border="light" className="text-right w-[36rem] shadow-sm">
      <Card.Header className="font-bold text-success border-bottom bg-white">{TableNames["Title"]}</Card.Header>
      <Row className="mt-4 px-3">
        <Col xs={{ order: 3 }}>
          <Card.Subtitle className="mb-2"><div className="font-bold">{TableNames["SchoolName"]}</div><div>{SchoolName}</div></Card.Subtitle>
          <Card.Subtitle><div className="font-bold">{TableNames["SchoolGrade"]}</div><div>{SchoolGrade}</div></Card.Subtitle>
        </Col>

        <Col xs={{ order: 2 }}>
          <Card.Subtitle className="mb-2"><div className="font-bold">{TableNames["City"]}</div><div>{CityName}</div></Card.Subtitle>
          {/* תצוגת שדה אזור חדש */}
          <Card.Subtitle className="mb-2">
            <div className="font-bold text-danger">{TableNames["Area"]}</div>
            <div>{District || "---"}</div>
          </Card.Subtitle>
        </Col>

        <Col xs={{ order: 1 }}>
          <Card.Subtitle className="mb-2">
            <div className="font-bold">{TableNames["ProgramName"]}</div>
            {/* ניקוי שם התוכנית: לקיחת החלק שלפני המקף */}
            <div><a href={LinkProgram}>{CurrentProgram.label.split('-')[0].trim()}</a></div>
          </Card.Subtitle>
          <Card.Subtitle><div className="font-bold">{TableNames["Weeks"]}</div><div>{Weeks}</div></Card.Subtitle>
        </Col>
      </Row>
      <Card.Subtitle className="px-3 mt-3"><div className="font-bold">{TableNames["Guides"]}</div><Card.Body className="p-1">{getGuides()}</Card.Body></Card.Subtitle>
      <Card.Subtitle className="px-3 py-3 border-top mt-2 bg-light"><div className="font-bold">{TableNames["AdditionalDetails"]}</div><div>{Details}</div></Card.Subtitle>
    </Card>
  );
};

export default CustomProgramModal;