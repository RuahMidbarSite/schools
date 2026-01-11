/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { ChangeEvent, Suspense, useRef } from "react";
import Select from 'react-select'
import { Button, Col, Container, Form, InputGroup, Row } from "react-bootstrap";
import { useState, useContext, useEffect } from "react";
import SchoolsTable from "@/components/Tables/SchoolTable/schooltable";
import { MessagePattern, StatusContacts, StatusSchools } from "@prisma/client";
import {
  getAllCities,
  getAllReligionSectors,
  getRoles,

  getEducationStages,
  getModelFields,
  TableType,
  addContactStatuses,
  getMessagePatterns,
  addPattern,
  deletePattern,
  updateContactsStatus,
  getSchoolTypes,
  getAllSchoolsTypes,
  getAllStatuses,
} from "@/db/generalrequests";
import { getSchools, selectSchools, getContacts, getSchoolsByIds, filterSchoolsByCities, getAllSchools } from "@/db/schoolrequests";
import { getAllContacts, selectContacts } from "@/db/contactsRequests";
import MultiSelectSearchBar from "@/components/multiselectsearchbar/MultiSelectSearchBar";
import pageText from "./messagesform-text.json";
import "./messagesForm.css";

import { SchoolsContact, School, ReligionSector, Cities } from "@prisma/client";
import { Console } from "console";
import { AgGridReact } from "ag-grid-react";
import { ICellRendererParams } from "ag-grid-community";

import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { title } from "process";
import { deletePatternFile, savePatternFile, sendMessageViaWhatsApp } from "@/db/whatsapprequests";
import { DataType, getFromStorage, updateStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";
import QrCode from "@/components/whatsapp/QrcodeComponent";





export type FilterOptions = {
  Filter: boolean,
  Cities?: String[],
  Sectors?: String[],
  EducationStage?: String[],
  SchoolStatus?: String[],
  SchoolTypes?: String[],
  ContactFilterOptions?: ContactFilterOptions

}

export type ContactFilterOptions = {
  IsRepresentive?: boolean | "Both"
  Roles?: String[],
  ContactStatus?: String[],
  Status?: String[]


}




export default function MessagesPage() {

  const qrCodeRef = useRef(null);
  const gridRef: any = useRef(null);

  // Row Data: The data to be displayed.
  const [rowData, setRowData]: any = useState("");

  // Column Definitions: Defines & controls grid columns.
  const [colDefs, setColDefs]: any = useState("");




  const searchBarLabelKey = (option: string) => option || "empty";

  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState<SchoolsContact[]>(
    []
  );
  const [filteredContacts, setFilteredContacts] = useState([]);

  const [schools, setSchools] = useState([]);
  const [Cities, setCities] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stages, setStages] = useState([]);

  const [statusesOptions, setStatusesOptions] = useState([]);

  const [SchoolStatuses,setSchoolStatuses]= useState<any[]>()
  const [ContactStatuses,setContactStatuses] = useState<any[]>()



  const [schoolTypes, setSchoolTypes] = useState([]);
  const [msgStatuses, setMsgStatuses] = useState([]);

  const [msg1, setMsg1] = useState("");
  const [msg2, setMsg2] = useState("");
  const [addedFile, setAddedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const [isRep, setIsRep] = useState(null);

  const [selectedSectors, setSelectedSectors] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedEductionStages, setSelectedEductionStages] = useState([]);
  const [selectedContactStatuses, setSelectedContactStatuses] = useState([]);
  const [selectedSchoolStatuses, setSelectedSchoolStatuses] = useState([]);

  const [patterns, setPatterns] = useState<MessagePattern[]>([]);

  const [selectedPattern, setSelectedPattern] = useState<MessagePattern>();

  const [selectedOption, setSelectedOption] = useState<{ value: number; label: string } | null>(null);


  const [patternTitle, setPatternTitle] = useState("");

  const [options, setOptions] = useState<{ value: number; label: string }[]>([]);

  const [newStatus, setNewStatus] = useState("");

  const [schoolAmount, setSchoolAmount] = useState(0);

  const [schoolAmountError, setSchoolAmountError] = useState(false);
  const [newStatusError, setNewStatusError] = useState(false);



  const [oneTime, updateOneTime] = useState(0);
  // this is used for adding new rows. using ref to prevent re-render.
  // dataRowCount is the current amount of rows in the database, rowCount is how many rows in the grid right now.
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);


  useEffect(() => {

    const fetchData = () => {
      getFromStorage().then(({ Cities, Religion, Role, SchoolStatuses, ContactsStatuses, Stages, messagePatterns, SchoolTypes }: DataType) => {
        if (Cities && Religion && Role && SchoolStatuses && ContactsStatuses && Stages && messagePatterns && SchoolTypes) {
          const citiesData = Cities
          const sectorsData = Religion
          const rolesData = Role
          const schoolsStatusesData = SchoolStatuses
          const stagesData = Stages
          const messagePatternsData = messagePatterns
          const schoolTypesData = SchoolTypes
          const cities = citiesData.map(
            (city: { CityName: any }) => city.CityName
          );
          const sectors = sectorsData.map(
            (sector: { ReligionName: any }) => sector.ReligionName
          );
          const roles = rolesData.map(
            (role: { RoleName: any }) => role.RoleName);


          const statuses = ContactsStatuses.map((val) => val.StatusName)
          const stages = stagesData.map(
            (stage: { StageName: any }) => stage.StageName
          );

          const transformedStatuses = statuses.map(status => ({
            value: status,
            label: status
          }));

          const schoolTypes = schoolTypesData.map(
            (schoolType: { TypeName: any }) => schoolType.TypeName
          )


          setCities(cities);
          setSectors(sectors);
          setRoles(roles);
          setSchoolStatuses(SchoolStatuses.map((val)=>val.StatusName))
          setContactStatuses(statuses);
          setStatusesOptions(transformedStatuses);
          setStages(stages);

          setPatterns(messagePatternsData);
          const formattedOptions = messagePatternsData.map(option => ({ value: option.PatternId, label: option.Caption }));
          setOptions(formattedOptions);
          setSchoolTypes(schoolTypes);

        } else {
          Promise.all([
            getAllCities(),
            getAllReligionSectors(),
            getRoles(),
            getAllStatuses("Schools"),
            getAllStatuses("Contacts"),
            getEducationStages(),
            getMessagePatterns(),
            getAllSchoolsTypes(),
          ]).then(([Cities, Religion, Role, SchoolStatuses, ContactStatuses, Stages, messagePatterns, SchoolTypes]) => {
            const citiesData = Cities
            const sectorsData = Religion
            const rolesData = Role
            const schoolsStatusesData = SchoolStatuses
            const stagesData = Stages
            const messagePatternsData = messagePatterns
            const schoolTypesData = SchoolTypes
            updateStorage({ Cities: Cities, Religion: Religion, Role: Role, SchoolStatuses: SchoolStatuses, ContactsStatuses: ContactStatuses, Stages: Stages, messagePatterns: messagePatterns, SchoolTypes: SchoolTypes })

            const cities = citiesData.map(
              (city: { CityName: any }) => city.CityName
            );
            const sectors = sectorsData.map(
              (sector: { ReligionName: any }) => sector.ReligionName
            );
            const roles = rolesData.map(
              (role: { RoleName: any }) => role.RoleName);


            const statuses = ContactStatuses.map((val) => val.StatusName)
            const stages = stagesData.map(
              (stage: { StageName: any }) => stage.StageName
            );

            const transformedStatuses = statuses.map(status => ({
              value: status,
              label: status
            }));

            const schoolTypes = schoolTypesData.map(
              (schoolType: { TypeName: any }) => schoolType.TypeName
            )


            setCities(cities);
            setSectors(sectors);
            setRoles(roles);
            setSchoolStatuses(SchoolStatuses.map((val)=>val.StatusName))
            setContactStatuses(statuses)
            setStatusesOptions(transformedStatuses);
            setStages(stages);

            setPatterns(messagePatternsData);
            const formattedOptions = messagePatternsData.map(option => ({ value: option.PatternId, label: option.Caption }));
            setOptions(formattedOptions);
            setSchoolTypes(schoolTypes);

           
          })
        }
      })

    }




    fetchData()

  }, [])


  useEffect(() => {
    console.log("selected cities: ", selectedCities);
    filterSchools();
  }, [selectedCities, selectedSectors, selectedEductionStages, selectedTypes, selectedSchoolStatuses]);

  useEffect(() => {
    if (selectedContacts.length > 0) {
      filterContacts();
    }
  }, [selectedContacts]);


  useEffect(() => {
    console.log("Patterns updated:", patterns);
  }, [patterns]);

  useEffect(() => {
    console.log("Options updated:", options);
  }, [options]);




  const onGridReady = async () => {
    getFromStorage().then(({ Schools, Religion, Cities, schoolsContacts, Tablemodel }: DataType) => {
      if (Schools && Religion && Cities && schoolsContacts && Tablemodel) {
        const schoolRows = Schools
        rowCount.current = schoolRows.length;
        dataRowCount.current = schoolRows.length;
        const model = Tablemodel
        const religion = Religion
        const cities = Cities
        setRowData(schoolRows);
        setSchools(schoolRows);
        setSelectedSchools(schoolRows)
        var colDefs: any = model[0]?.map((value: any, index: any) => {
          if (value === "ReligiousSector") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "agSelectCellEditor",
              cellEditorParams: {
                values: religion,
              },

              filter: true,
            };
          }
          if (value === "City") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "CustomSelect",
              cellEditorParams: {
                selectData: cities.map((val) => ({ value: val, label: val })),
              },
              filter: true,
              cellEditorPopup: true,
              cellEditorPopupPosition: "under",
            };
          }
          // no edit here..
          if (value === "Schoolid") {
            return {
              field: value,
              headerName: model[1][index],
              cellEditor: "agTextCellEditor",
              rowDrag: true,
            };
          }

          if (value === "Representive") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "CustomSelect",
              cellEditorParams: {
                selectData: schoolsContacts,
              },
              filter: true,
              cellEditorPopup: true,
              cellEditorPopupPosition: "under",
            };
          }

          return {
            field: value,
            headerName: model[1][index],
            editable: true,
            cellEditor: "agTextCellEditor",
            filter: true,
          };
        });

        setColDefs(colDefs);
      } else {
        Promise.all([getAllSchools(), getAllReligionSectors(), getAllCities(), getAllContacts(), getModelFields("School")]).then((
          [schools, religion, cities, schoolsContacts, model]
        ) => {

          const schoolRows = schools
          rowCount.current = schoolRows.length;
          dataRowCount.current = schoolRows.length;

          setRowData(schools);
          setSchools(schools);
          setSelectedSchools(schools)
          updateStorage({ Schools: schools, Cities: cities, Religion: religion, schoolsContacts: schoolsContacts, Tablemodel: model })
          var colDefs: any = model[0]?.map((value: any, index: any) => {
            if (value === "ReligiousSector") {
              return {
                field: value,
                headerName: model[1][index],
                editable: true,
                cellEditor: "agSelectCellEditor",
                cellEditorParams: {
                  values: religion,
                },

                filter: true,
              };
            }
            if (value === "City") {
              return {
                field: value,
                headerName: model[1][index],
                editable: true,
                cellEditor: "CustomSelect",
                cellEditorParams: {
                  selectData: cities.map((val) => ({ value: val, label: val })),
                },
                filter: true,
                cellEditorPopup: true,
                cellEditorPopupPosition: "under",
              };
            }
            // no edit here..
            if (value === "Schoolid") {
              return {
                field: value,
                headerName: model[1][index],
                cellEditor: "agTextCellEditor",
                rowDrag: true,
              };
            }

            if (value === "Representive") {
              return {
                field: value,
                headerName: model[1][index],
                editable: true,
                cellEditor: "CustomSelect",
                cellEditorParams: {
                  selectData: schoolsContacts,
                },
                filter: true,
                cellEditorPopup: true,
                cellEditorPopupPosition: "under",
              };
            }

            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "agTextCellEditor",
              filter: true,
            };
          });

          setColDefs(colDefs);
        })


      }
    })



  }

  const filterSchools = () => {
    const filteredSchools = schools.filter(school => {
      return (
        (selectedCities.includes(school.City) || selectedCities.length === 0) &&
        (selectedSectors.includes(school.ReligiousSector) || selectedSectors.length === 0) &&
        (selectedEductionStages.includes(school.EducationStage) || selectedEductionStages.length === 0) &&
        (selectedTypes.includes(school.SchoolType) || selectedTypes.length === 0) &&
        (selectedSchoolStatuses.includes(school.Status) || selectedSchoolStatuses.length === 0)
      );
    });
    setSelectedSchools(filteredSchools)
    console.log("selected schooles: ", filteredSchools);
    setRowData(filteredSchools);
  };

  const filterContacts = () => {
    const filteredContacts = selectedContacts.filter(contact => {
      return (
        (selectedContactStatuses.includes(contact.Status) || selectedContactStatuses.length === 0) &&
        (selectedRoles.includes(contact.Role) || selectedRoles.length === 0) &&
        (isRep === null || contact.IsRepresentive === isRep)
      );
    });
    setFilteredContacts(filteredContacts);
    console.log("selected contacts: ", filteredContacts);
  };


  const handleCitySelectionChange = (selected: string[]) => {
    setSelectedCities(selected);
  };

  const handleSectorSelectionChange = (
    selected: string[]
  ) => {
    setSelectedSectors(selected);
    filterSchools();
  };

  const handleRoleSelectionChange = (
    selected: React.SetStateAction<never[]>
  ) => {
    setSelectedRoles(selected);
    console.log("selectedRoles: ", selectedRoles);
  };

  const handleStagesSelectionChange = (
    selected: React.SetStateAction<never[]>
  ) => {
    setSelectedEductionStages(selected);
    console.log("selectedEductionStages: ", selectedEductionStages);
  };

  const handleStatusChange = (selectedStatus) => {
    setNewStatus(selectedStatus);
  };

  const handleContactStatusesSelectionChange = (
    selected: string[]
  ) => {
    setSelectedContactStatuses(selected);
    // filterContacts();
    console.log("selectedContactStatuses: ", selectedContactStatuses);
  };

  const handleSchoolStatusesSelectionChange = (
    selected: React.SetStateAction<never[]>
  ) => {
    setSelectedSchoolStatuses(selected);
    console.log("selectedSchoolStatuses: ", selectedSchoolStatuses);
  };

  const handlePatternChange = (selected: any) => {
    if (selected === null) {
      clearPattern();
      return;
    }
    setSelectedOption(selected);
    const selectedObject = patterns.find(option => option.PatternId === selected.value);
    // Accessing different columns
    if (selectedObject) {
      const Id = selectedObject.PatternId;
      const Caption = selectedObject.Caption;
      const Message1 = selectedObject.Message1;
      const Message2 = selectedObject.Message2;
      const file = selectedObject.File;


      setPatternTitle(Caption)
      setMsg1(Message1)
      setMsg2(Message2)
      setFileName(file);
      const chosenPattern = patterns.find(pattern => pattern.PatternId === selected.value);
      setSelectedPattern(chosenPattern);
    }
  };



  const clearPattern = () => {
    setPatternTitle("")
    setMsg1("");
    setMsg2("");
    setAddedFile(null);
    setSelectedPattern(null);
    setSelectedOption(null);
    setFileName("");
  }


  const addPatternHandler = async () => {
    if (patternTitle !== "") {
      console.log("addedFile: ", addedFile);
      let fileName = "";
      if (addedFile !== null) {
        fileName = addedFile.name;
      }
      setFileName(fileName);
      const id = patterns.length + 1;
      Promise.all([addPattern(id, patternTitle, msg1, msg2, fileName), savePatternFile(id, addedFile)]).then(([new_pattern, add_file_result]) => {
        console.log("new_pattern: ", new_pattern);
        console.log('add file result', add_file_result)
        setPatterns(prevPatterns => [...prevPatterns, new_pattern]);
        if (new_pattern.PatternId && new_pattern.Caption) {
          setOptions(prevOptions => [
            ...prevOptions,
            { value: new_pattern.PatternId, label: new_pattern.Caption }
          ]);
        }

      })

      clearPattern();
    } else {
      alert("יש להזין כותרת לתבנית");
    }
  };

  const handleDeletePattern = () => {
    const newOptions = options.filter(option => option != selectedOption)
    const newPatterns = patterns.filter(pattern => pattern != selectedPattern);
    Promise.all([deletePattern(selectedPattern.PatternId), deletePatternFile(selectedPattern.PatternId)]).then((res) => {
      console.log(res)

    })

    setSelectedOption(null);
    setSelectedPattern(null);
    setOptions(newOptions);
    setPatterns(newPatterns);
    clearPattern();
  }

  const handleIsRepChange = (value) => {
    setIsRep(value);
    // filterContacts();
  };

  const handleSchoolAmountChange = (e) => {
    const value = Number(e.target.value);
    if (value >= 0) {
      setSchoolAmount(value);
      setSelectedSchools(rowData.slice(0, value));
      console.log("number of schools is: ", selectedSchools.length)
    }
  };

  const handleTypeSelectionChange = (
    selected: string[]
  ) => {
    setSelectedTypes(selected);
    filterSchools();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAddedFile(e.target.files[0]);
      setFileName(e.target.files[0].name)
    }
  };

  return (
    <>
<QrCode ref={qrCodeRef}/>
      <Container fluid className="formGrid text-end bg-transparent">
        <Row className="borderedColumns flex-row-reverse">
          <Col className="square border border-dark custom-col">
            <Row className="mb-3 justify-content-end">
              <Col>
                <h4>תוכן ההודעה</h4>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Button
                  variant="info"
                  onClick={addPatternHandler}
                >
                  {pageText.addMessagePattern}
                </Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <InputGroup className="mb-3">
                  <Form.Control
                    placeholder={patternTitle}
                    style={{ direction: "rtl", textAlign: "right" }}
                    onBlur={(e) => {
                      setPatternTitle(e.target.value);
                    }}
                  />
                </InputGroup>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
                <Select
                  options={options}
                  value={selectedOption}
                  onChange={handlePatternChange}
                  placeholder="..בחר תבנית הודעות"
                  isClearable
                />
                <br></br>
                <Button onClick={handleDeletePattern}>
                  {pageText.deleteMessagePattern}
                </Button>
              </Col>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} controlId="formMsgText1">
                <Form.Label>{pageText.msgTextLabel}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={msg1}
                  style={{ direction: "rtl", textAlign: "right" }}
                  onChange={(e) => setMsg1(e.target.value)}
                />
              </Form.Group>

              <Row className="mb-3">
                <Form.Group as={Col} controlId="formMsgText2">
                  <Form.Label>{pageText.msgFileLabel}</Form.Label>

                  <input
                    type="file"
                    id="fileInput"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <br></br>
                  <Button
                    className="file-input-button" // Apply custom class
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    {fileName ? fileName : "..בחר קובץ"}
                  </Button>
                </Form.Group>
              </Row>
              <Row className="mb-3"></Row>
              <Form.Group as={Col} controlId="formMsgText3">
                <Form.Label>{pageText.msgTextLabel}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={msg2}
                  style={{ direction: "rtl", textAlign: "right" }}
                  onChange={(e) => {
                    setMsg2(e.target.value);
                  }}
                />
              </Form.Group>
            </Row>
            <Row>
  <Col>
    <Button
      variant="danger"
      onClick={() => {
        console.log("=== 🔴 BUTTON CLICKED! ===");
        
        (async () => {
          try {
            console.log("=== 📍 INSIDE ASYNC FUNCTION ===");
            
            const testPhone = '526554868'; 
            const countryCode = '972';
            const fullPhone = countryCode + testPhone;
            
            console.log("🧪 Test button clicked!");
            console.log("📞 Sending to:", fullPhone);
            console.log("💬 Message 1:", msg1 || "הודעת טסט");
            console.log("💬 Message 2:", msg2 || "empty");
            console.log("📎 File:", addedFile?.name || "no file");
            
            // ✅ תיקון 1: בדוק חיבור
            console.log("🔍 בודק אם כבר מחובר...");
            const checkUrl = `${process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994'}/Initialize`;
            
            let isAlreadyConnected = false;
            
            try {
              console.log("📡 Fetching:", checkUrl);
              const checkRes = await fetch(checkUrl, { method: "GET" });
              console.log("📥 Response status:", checkRes.status);
              
              const checkData = await checkRes.json();
              console.log("📦 Response data:", checkData);
              
              if (checkData && checkData.result === 'ready') {
                console.log("✅ כבר מחובר!");
                isAlreadyConnected = true;
              }
            } catch (err) {
              console.error("❌ שגיאה בבדיקת חיבור:", err);
              alert("שגיאה בחיבור לשרת: " + err.message);
              return;
            }
            
            // ✅ תיקון 2: אם לא מחובר - התחבר
            if (!isAlreadyConnected) {
              console.log("🔌 לא מחובר, מנסה להתחבר...");
              
              if (!qrCodeRef.current) {
                alert("שגיאה: קומפוננט QR לא זמין");
                return;
              }

              console.log("📱 קורא ל-checkConnection...");
              const isConnected = await qrCodeRef.current.checkConnection();
              console.log("✅ תוצאת חיבור:", isConnected);
              
              if (!isConnected) {
                console.log("❌ נכשל בחיבור");
                alert("נכשל בחיבור. נסה שוב.");
                return;
              }

              console.log("⏳ ממתין 3 שניות...");
              await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // ✅ תיקון 3: שלח הודעה (גם אם ריקה)
            console.log("=== 📤 שולח הודעה ===");
            
            // אם אין הודעה - שלח הודעת טסט ברירת מחדל
            const messageToSend = msg1 || "הודעת טסט מהמערכת 🎉";
            
            console.log("📝 הודעה לשליחה:", messageToSend);
            
            const result = await sendMessageViaWhatsApp(
              messageToSend,  // ✅ תמיד נשלח משהו
              msg2, 
              addedFile, 
              testPhone,
              countryCode,
              selectedPattern?.PatternId
            );
            
            console.log("📊 תוצאת שליחה:", result);
            
            if (result.success) {
              alert("הודעת הטסט נשלחה בהצלחה! ✅\nנשלח ל: " + fullPhone);
              console.log("✅ הודעה נשלחה בהצלחה!");
            } else {
              alert("שגיאה: " + (result.error || "שגיאה לא ידועה"));
              console.error("❌ שגיאה בשליחה:", result.error);
            }
            
          } catch (error) {
            console.error("❌ שגיאה כללית:", error);
            alert("שגיאה: " + (error instanceof Error ? error.message : "שגיאה לא ידועה"));
          }
        })();
      }}
    >
      {pageText.testButton}
    </Button>
  </Col>
</Row>
          </Col>

          <Col className="square border border-dark">
            <Form>
              <Row className="mb-3">
                <Col>
                  <h2>בחר בתי ספר</h2>
                </Col>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formSchoolAmount">
                  <Form.Label>{pageText.schoolAmountLabel}</Form.Label>
                  <Form.Control
                    type="number"
                    value={schoolAmount}
                    onChange={handleSchoolAmountChange}
                    step={5}
                  />
                  {schoolAmountError ?
                    <p className="errorMessage">{pageText.schoolAmountError}</p> : null}
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formSchoolStatuses">
                  <Form.Label>{pageText.schoolStatusesLabel}</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedSchoolStatuses}
                    setSelected={handleSchoolStatusesSelectionChange}
                    options={SchoolStatuses}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                  <Form.Text className="text-muted">
                    {pageText.noneChosenNote}
                  </Form.Text>
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>שלבי חינוך</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedEductionStages}
                    setSelected={handleStagesSelectionChange}
                    options={stages}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>מגזרים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedSectors}
                    setSelected={handleSectorSelectionChange}
                    options={sectors}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>סוגים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedTypes}
                    setSelected={handleTypeSelectionChange}
                    options={schoolTypes}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>ערים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedCities}
                    setSelected={handleCitySelectionChange}
                    options={Cities}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
            </Form>
          </Col>

          <Col className="square border border-dark">
            <Form>
              <Row className="mb-3">
                <Col>
                  <h2>{pageText.chooseContacts}</h2>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col>
                  <b>{pageText.setPriority}</b>
                </Col>
              </Row>

              <Row className="mb-3">
                <Form.Group as={Col} controlId="formContactIsRep">
                  <Form.Label>{pageText.contactIsRepLabel}</Form.Label>
                  <Form.Check
                    inline
                    type="radio"
                    label={pageText.yes}
                    name="isRepRadios"
                    id="isRepRadios1"
                    onClick={() => handleIsRepChange(true)}
                    checked={isRep === true}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label={pageText.no}
                    name="isRepRadios"
                    id="isRepRadios2"
                    onClick={() => handleIsRepChange(false)}
                    checked={isRep === false}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label={pageText.both}
                    name="isRepRadios"
                    id="isRepRadios3"
                    onClick={() => handleIsRepChange(null)}
                    checked={isRep === null}
                  />
                </Form.Group>
              </Row>

              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>תפקידים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedRoles}
                    setSelected={handleRoleSelectionChange}
                    options={roles}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>סטטוסים של אנשי קשר</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedContactStatuses}
                    setSelected={handleContactStatusesSelectionChange}
                    options={ContactStatuses}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              {/* Other form elements... */}
            </Form>

            <Row className="mb-3">
              <Col></Col>
            </Row>
            <Row className="mb-3">
              <Col>
                <Button
                  variant="primary"
                  onClick={() => {

                  }}
                >
                  {pageText.addPriority}
                </Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (schoolAmount > 0) {

                      const selectedSchoolsIds = selectedSchools.map(
                        (id: { Schoolid: any }) => id.Schoolid
                      )

                      const contacts = await selectContacts(
                        selectedSchoolsIds
                      );
                      setSelectedContacts(contacts);
                      setMsgStatuses([]);
                    } else {
                      setSchoolAmountError(true);
                      alert(pageText.schoolAmountError);
                    }
                  }}
                >
                  {pageText.chooseContacts}
                </Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Form.Group as={Col} controlId="formNewStatus">
                <Form.Label>בחר סטטוס</Form.Label>
                <Select
                  value={newStatus}
                  onChange={handleStatusChange}
                  options={statusesOptions}
                  isClearable
                  placeholder="..בחר סטטוס"
                />
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Col>
                <Button
                  variant="primary"
                  onClick={async () => {
                    setNewStatusError(false);
                    console.log("contacts: ", filteredContacts);
                    const numbers: string[] = filteredContacts.map(
                      (contact: { Cellphone: any }) => contact.Cellphone
                    );

                    let promise = []
                    // for (const num of numbers) {
                    //   promise.push(sendMessageViaWhatsApp(msg1, msg2, addedFile, num, "972", selectedPattern?.PatternId));
                    // }
                    // Promise.all([...promise]).then((val) => {
                    //   console.log(val)

                    // })

                    const filteredContactsIds = filteredContacts.map(
                      (id: { Contactid: any }) => id.Contactid
                    )
                    await updateContactsStatus(newStatus['value'], filteredContactsIds);
                  }}
                >
                  {pageText.sendMessages}
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>

        <Row>
          <Col>
            <p>{`Amount of Selected Schools: ${selectedSchools.length}, Amount of Selected Contacts: ${filteredContacts.length}`}</p>
          </Col>
        </Row>
        <Suspense>
          <div
            id="grid-1"
            className="ag-theme-quartz-dark "
            style={{ width: "100%", height: "1000px" }}
          >

            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={colDefs}
              enableRtl={true}
              onGridReady={onGridReady}
            />
          </div>
        </Suspense>
      </Container>
    </>
  );
}