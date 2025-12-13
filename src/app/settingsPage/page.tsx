"use client"
import React, { createContext, Suspense, useContext, useEffect, useState } from 'react';
import AddNamesForm from '../../components/AddNamesForm/AddNamesForm';
import Select from 'react-select'
// import { getYears } from '@/db/generalrequests';
import { YearContext, YearProvider, useYear } from '@/context/YearContext'; // Import the provider and hook
import { getAllCities, getAllDistricts, getAllReligionSectors, getAllSchoolsTypes, getAllStatuses, getAllYears, getEducationStages, getOrders, getProductTypes, getRoles, getYears } from '@/db/generalrequests';
import { DataType, getFromStorage, updateStorage } from '@/components/SettingsPage/Storage/Storage/SettingsDataStorage';
import { Areas, Cities, Distances, EducationStage, ProductTypes, ReligionSector, Role, SchoolTypes, Years, Orders, StatusPrograms, StatusContacts, StatusGuides, StatusSchools } from '@prisma/client';
import { CustomContext } from './context';
import Container from 'react-bootstrap/esm/Container';
import AsyncSelect from 'react-select/async';
import { SelectNewCities } from '@/components/SettingsPage/components/SelectNewCities';
import { getAllDistances } from '@/db/instructorsrequest';
import { SelectDeleteCities } from '@/components/SettingsPage/components/SelectDeleteCities';
import { StatusContext, useStatus } from '@/context/StatusContext';
import { Col, Row } from 'react-bootstrap';

type OptionsPage = {
  cities: false;
  areas?: false;
  religionSectors: false;
  educationStages: false;
  SchoolStatuses: false;
  ProgramStatuses: false;
  ContactStatuses: false;
  GuideStatuses: false;
  schoolTypes: false;
  products: false;
  years: false;
  roles: false;
  orders: false;
};
type OptionsNamed = keyof OptionsPage
const SettingsPage = () => {

  const [Roles, setRoles] = useState<Role[]>();
  const [Years, setYears] = useState<Years[]>();
  const [ProductTypes, setProductTypes] = useState<ProductTypes[]>();
  const [Types, setTypes] = useState<SchoolTypes[]>();
  const [Stages, setStages] = useState<EducationStage[]>();
  const [Religion, setReligion] = useState<ReligionSector[]>();
  const [Areas, setAreas] = useState<Areas[]>();
  const [Cities, setCities] = useState<Cities[]>();
  const [ProgramStatuses, setProgramStatuses] = useState<StatusPrograms[]>();
  const [ContactsStatuses, setContactsStatuses] = useState<StatusContacts[]>();
  const [GuidesStatuses, setGuidesStatuses] = useState<StatusGuides[]>()
  const [SchoolStatuses, setSchoolStatuses] = useState<StatusSchools[]>()
  const [Distances, setDistances] = useState<Distances[]>()
  const [Orders, setOrders] = useState<Orders[]>()

  const [yearOptions, setYearOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([])
  const { selectedYear, changeYear } = useContext(YearContext)
  const { defaultStatus, changeStatus } = useContext(StatusContext)

  const [selectedYearOption, setSelectedYearOption] = useState({ label: "הכל", value: undefined });
  const [selectedStatusOption, setSelectedStatusOption] = useState({ label: "הכל", value: undefined })

  const [formUpdate, setFormUpdate] = useState(false);


  const [showForms, setShowForms] = useState<OptionsPage>({
    cities: false,
    areas: false,
    religionSectors: false,
    educationStages: false,
    SchoolStatuses: false,
    ProgramStatuses: false,
    ContactStatuses: false,
    GuideStatuses: false,
    schoolTypes: false,
    products: false,
    years: false,
    roles: false,
    orders: false
  });

  useEffect(() => {
    const getData = async () => {
      getFromStorage().then(({ Role, Years, ProductTypes, SchoolTypes, Stages, Religion, Areas, Cities, SchoolStatuses, ProgramsStatuses, ContactsStatuses, GuidesStatuses, Distances, Orders }: DataType) => {

        if (Role && Years && ProductTypes && SchoolTypes && Stages && Religion && Areas && Cities && SchoolStatuses && ProgramsStatuses && ContactsStatuses && GuidesStatuses && Distances && Orders) {
          setRoles(Role);
          setYears(Years);
          setProductTypes(ProductTypes);
          setTypes(SchoolTypes);
          setStages(Stages);
          setReligion(Religion);
          setAreas(Areas);
          setCities(Cities);
          setProgramStatuses(ProgramsStatuses)
          setSchoolStatuses(SchoolStatuses)
          setGuidesStatuses(GuidesStatuses)
          setContactsStatuses(ContactsStatuses)
          setDistances(Distances)
          setOrders(Orders)
        }
        else {
          Promise.all([getRoles(), getAllYears(), getProductTypes(), getAllSchoolsTypes(), getEducationStages(), getAllReligionSectors(), getAllDistricts(),
          getAllCities(), getAllStatuses("Contacts"), getAllStatuses("Programs"), getAllStatuses("Guides"), getAllStatuses("Schools"), getAllDistances(), getOrders()])
            .then(([Role, Years, ProductTypes, Types, Stages, Religion, Areas, Cities, StatusContacts, StatusPrograms, StatusGuides, StatusSchools, Distances, Orders]) => {
              setRoles(Role);
              setYears(Years);
              setProductTypes(ProductTypes);
              setTypes(Types);
              setStages(Stages);
              setReligion(Religion);
              setAreas(Areas);
              setCities(Cities);
              setProgramStatuses(StatusPrograms)
              setContactsStatuses(StatusContacts)
              setGuidesStatuses(StatusGuides)
              setSchoolStatuses(StatusSchools)
              setDistances(Distances);
              setOrders(Orders);
              updateStorage({
                Role: Role, Years: Years, ProductTypes: ProductTypes, SchoolTypes: Types, Stages: Stages, Religion: Religion, Areas: Areas, Cities: Cities,
                SchoolStatuses: StatusSchools, ProgramsStatuses: StatusPrograms, GuidesStatuses: StatusGuides, ContactsStatuses: StatusContacts, Distances: Distances, Orders: Orders
              })
            })

        }


      })



    }
    getData().then((res) => console.log('finished loading data'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    const fetchData = async () => {
      getFromStorage().then(({ Years, ProgramsStatuses }: DataType) => {
        // fetch from storage
        if (Years && ProgramStatuses) {

          setYears(Years);
          setProgramStatuses(ProgramStatuses)

          const yearOptions = Years.map(year => ({
            label: year.YearName,
            value: year.YearName,
          }));
          yearOptions.push({ label: "הכל", value: undefined });
          setYearOptions(yearOptions);

          const initialSelectedYearOption = yearOptions.find(option => option.value === selectedYear) || { label: "הכל", value: undefined };
          setSelectedYearOption(initialSelectedYearOption);

          const statusOptions = ProgramsStatuses.map(status => ({
            label: status.StatusName,
            value: status.StatusName,
          }));
          statusOptions.push({ label: "הכל", value: undefined });
          setStatusOptions(statusOptions);

          const initialSelectedStatusOption = statusOptions.find(option => option.value === defaultStatus) || { label: "הכל", value: undefined };
          setSelectedStatusOption(initialSelectedStatusOption);


          console.log("Years: ", Years);
          console.log("Statuses: ", ProgramsStatuses);

        } else {
          Promise.all([getAllYears(), getAllStatuses("Programs")]).then(([Years, Statuses]) => {
            setYears(Years);
            setProgramStatuses(Statuses)

            // Handle Year Options
            const yearOptions = Years.map(year => ({
              label: year.YearName,
              value: year.YearName,
            }));
            yearOptions.push({ label: "הכל", value: undefined });
            setYearOptions(yearOptions);

            const initialSelectedYearOption = yearOptions.find(option => option.value === selectedYear) || { label: "הכל", value: undefined };
            setSelectedYearOption(initialSelectedYearOption);

            const statusOptions = Statuses.map(status => ({
              label: status.StatusName,
              value: status.StatusName,
            }));
            statusOptions.push({ label: "הכל", value: undefined });
            setStatusOptions(statusOptions);

            const initialSelectedStatusOption = statusOptions.find(option => option.value === defaultStatus) || { label: "הכל", value: undefined };
            setSelectedStatusOption(initialSelectedStatusOption);

            console.log("Years: ", Years);
            console.log("Statuses: ", Statuses);

            // Update storage after fetching data
            updateStorage({ Years: Years, ProgramsStatuses: Statuses });

          })
        }
      })

    }


    fetchData();


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const toggleForm = (formName: OptionsNamed) => {
    setShowForms((prev) => ({
      ...prev,
      [formName]: !prev[formName],
    }));
  };





  const handleYearChange = (selectedOption) => {

    changeYear(selectedOption.value); // Update the selected selectedYear
    setSelectedYearOption(selectedOption)

  };
  const handleStatusChange = (selectedOption) => {
    changeStatus(selectedOption.value); // Update the selected status.
    setSelectedStatusOption(selectedOption)

  };

  const resetSettings = () => {
    setSelectedYearOption({ label: "הכל", value: undefined });  // Reset selected option
    changeYear(undefined);        // Reset selected year in context if needed
    changeStatus(undefined)
    setSelectedStatusOption({ label: "הכל", value: undefined });
    closeAllForms();

  };

  const closeAllForms = () => {

    Object.keys(showForms).forEach((formName: OptionsNamed) => {
      if (showForms[formName]) {
        toggleForm(formName);
      }
    });
  };

  // Find the current selected year option object
  // const selectedYearOption = yearOptions.find(option => option.value === selectedYear);

  return (
    <CustomContext.Provider
      value={{
        Roles,
        Years,
        ProductTypes,
        Types,
        Stages,
        Religion,
        Areas,
        Cities,
        SchoolStatuses,
        ProgramStatuses,
        ContactsStatuses,
        GuidesStatuses,
        Orders,
        Distances,
        setRoles,
        setYears,
        setProductTypes,
        setTypes,
        setStages,
        setReligion,
        setAreas,
        setCities,
        setSchoolStatuses,
        setProgramStatuses,
        setContactsStatuses,
        setGuidesStatuses,
        setOrders,
        setDistances
      }}
    >
      <Container fluid>



        <Row >

          <Col lg={{ order: 'last', span: 1, offset: 11 }}>


            <div> שנה ברירת מחדל בתוכניות</div>


            <Select
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={{
                menu: (provided) => ({
                  ...provided,
                  zIndex: 1, // Set your desired z-index
                }),
              }}
              options={yearOptions}
              value={selectedYearOption}
              placeholder="בחר שנת ברירת מחדל.."
              onChange={handleYearChange}
            />


          </Col>
        </Row>
        <Row>
          <Col lg={{ order: 'last', offset: '11', span: 1 }}>
            <div> סטטוס ברירת מחדל בתוכניות ושיבוצים</div>
            <Select
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={{
                menu: (provided) => ({
                  ...provided,
                  zIndex: 1, // Set your desired z-index
                }),
              }}
              options={statusOptions}
              value={selectedStatusOption}
              placeholder="בחר סטטוס ברירת מחדל..."
              onChange={handleStatusChange}
            />

          </Col>
        </Row>
        <Row>
          <Col lg={{ order: 'first', span: 1, offset: 11 }} >

            <button className="px-3 py-2 mr-2 bg-green-500 hover:bg-[#45a049] text-white border-none rounded cursor-pointer" onClick={resetSettings}>איפוס הגדרות</button>
          </Col>
        </Row>

        <Row>
          <Col lg={{ order: 'last' }}>
            <div className="rtl text-bold text-lg float-right" >:עדכון מסד הנתונים</div>
          </Col>
        </Row>

        <Row className="flex-row-reverse" >
          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('cities')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.cities ? 'סגור' : 'ערים'}
            </button>
            {showForms.cities && (
              <div>
                <SelectNewCities Cities={Cities} Distances={Distances} setCities={setCities} />
                <SelectDeleteCities Cities={Cities} Distances={Distances} setCities={setCities} />
              </div>
            )

            }

          </Col>
          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('areas')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.areas ? 'סגור' : 'אזורים'}
            </button>

            {showForms.areas && (
              <AddNamesForm
                collectionName="Areas"
                idFieldName="Areaid"
                nameFieldName="AreaName"
                onClose={() => toggleForm('areas')}
                placeHolder='הוסף אזור'

              />

            )}
          </Col>

          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('religionSectors')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.religionSectors ? 'סגור' : 'מגזרים'}
            </button>
            {showForms.religionSectors && (
              <AddNamesForm
                collectionName="ReligionSector"
                idFieldName="Religionid"
                nameFieldName="ReligionName"
                onClose={() => toggleForm('religionSectors')}
                placeHolder='הוסף מגזר'
              />
            )}

          </Col>
          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('educationStages')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.educationStages ? 'סגור' : 'שלבי חינוך'}
            </button>
            {showForms.educationStages && (
              <AddNamesForm
                collectionName="EducationStage"
                idFieldName="StageId"
                nameFieldName="StageName"
                onClose={() => toggleForm('educationStages')}
                placeHolder='הוסף שלב חינוך'
              />
            )}
          </Col>

          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('schoolTypes')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.schoolTypes ? 'סגור' : 'סוגי בית ספר'}
            </button>
            {showForms.schoolTypes && (
              <AddNamesForm
                collectionName="SchoolTypes"
                idFieldName="TypeId"
                nameFieldName="TypeName"
                onClose={() => toggleForm('schoolTypes')}
                placeHolder='הוסף סוג ב"ס'
              />
            )}
          </Col>
        </Row>


        <Row>
           <Col>
           <div className="h-[20px]"/>
         </Col>
     </Row>

        <Row className="flex-row-reverse">
          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('ContactStatuses')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.ContactStatuses ? 'סגור' : 'סטטוס אנשי קשר'}
            </button>
            {showForms.ContactStatuses && (
              <AddNamesForm
                collectionName="StatusContacts"
                idFieldName="StatusId"
                nameFieldName="StatusName"
                onClose={() => {

                  toggleForm('ContactStatuses')
                  setFormUpdate((prev) => !prev); // Update formUpdate to trigger useEffect again
                }}
                placeHolder='הוסף סטטוס'
              />
            )}
          </Col>
          <Col  lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('GuideStatuses')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.GuideStatuses ? 'סגור' : 'סטטוס מדריכים'}
            </button>
            {showForms.GuideStatuses && (
              <AddNamesForm
                collectionName="StatusGuides"
                idFieldName="StatusId"
                nameFieldName="StatusName"
                onClose={() => {
                  toggleForm('GuideStatuses')
                  setFormUpdate((prev) => !prev); // Update formUpdate to trigger useEffect again
                }}
                placeHolder='הוסף סטטוס'
              />
            )}

          </Col>
          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('ProgramStatuses')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.ProgramStatuses ? 'סגור' : 'סטטוס תוכניות'}
            </button>
            {showForms.ProgramStatuses && (
              <AddNamesForm
                collectionName="StatusPrograms"
                idFieldName="StatusId"
                nameFieldName="StatusName"
                onClose={() => {
                  toggleForm('ProgramStatuses')
                  setFormUpdate((prev) => !prev); // Update formUpdate to trigger useEffect again
                }}
                placeHolder='הוסף סטטוס'
              />
            )}

          </Col>
          <Col  lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('SchoolStatuses')} className="show-form-button hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.SchoolStatuses ? 'סגור' : 'סטטוס בתי ספר'}
            </button>
            {showForms.SchoolStatuses && (
              <AddNamesForm
                collectionName="StatusSchools"
                idFieldName="StatusId"
                nameFieldName="StatusName"
                onClose={() => {
                  toggleForm('SchoolStatuses')
                  setFormUpdate((prev) => !prev); // Update formUpdate to trigger useEffect again
                }}
                placeHolder='הוסף סטטוס'
              />
            )}
          </Col>
          <Col  lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('products')} className="show-form-button z-0 relative hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.products ? 'סגור' : 'מוצרים'}
            </button>
            {showForms.products && (
              <AddNamesForm
                collectionName="ProductTypes"
                idFieldName="ProductId"
                nameFieldName="ProductName"
                onClose={() => toggleForm('products')}
                placeHolder='הוסף מוצר'
              />
            )}
          </Col>
          <Col  lg={{span:2,offset:0}}>
            <button
              onClick={() => toggleForm("years")}
              className="show-form-button z-0 relative hover:bg-[#45a049] px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer"
            >
              {showForms.years ? "סגור" : "שנים"}
            </button>
            {showForms.years && (
              <AddNamesForm
                collectionName="Years"
                idFieldName="YearId"
                nameFieldName="YearName"
                onClose={() => {
                  toggleForm("years");
                  setFormUpdate((prev) => !prev); // Update formUpdate to trigger useEffect again
                }}
                placeHolder="הוסף שנה"
              />
            )}
          </Col>
          </Row> 

            <Row>
           <Col>
           <div className="h-[20px]"/>
         </Col>
     </Row>
           <Row className="flex-row-reverse">
          <Col  lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('roles')} className="show-form-button  hover:bg-[#45a049] z-0 relative px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.roles ? 'סגור' : 'תפקידים'}
            </button>
            {showForms.roles && (
              <AddNamesForm
                collectionName="Role"
                idFieldName="RoleId"
                nameFieldName="RoleName"
                onClose={() => toggleForm('roles')}
                placeHolder='הוסף תפקיד'
              />
            )}

          </Col>
          <Col lg={{span:2,offset:0}}>
            <button onClick={() => toggleForm('orders')} className="show-form-button  hover:bg-[#45a049] z-0 relative px-3 py-2 mr-2 bg-green-500 text-white border-none rounded cursor-pointer">
              {showForms.orders ? 'סגור' : 'הזמנות'}
            </button>
            {showForms.orders && (
              <AddNamesForm
                collectionName="Orders"
                idFieldName="OrderId"
                nameFieldName="OrderName"
                onClose={() => toggleForm('orders')}
                placeHolder='הוסף הזמנה'
              />
            )}
          </Col>
        </Row>

      </Container>
    </CustomContext.Provider>
  );
};



export default SettingsPage;