"use client"
import React, { createContext, useContext, useEffect, useState } from 'react';
import AddNamesForm from '../../components/AddNamesForm/AddNamesForm';
import Select, { StylesConfig } from 'react-select'
import { YearContext } from '@/context/YearContext';
import { getAllCities, getAllDistricts, getAllReligionSectors, getAllSchoolsTypes, getAllStatuses, getAllYears, getEducationStages, getOrders, getProductTypes, getRoles } from '@/db/generalrequests';
import { DataType, getFromStorage, updateStorage } from '@/components/SettingsPage/Storage/Storage/SettingsDataStorage';
import { Areas, Cities, Distances, EducationStage, ProductTypes, ReligionSector, Role, SchoolTypes, Years, Orders, StatusPrograms, StatusContacts, StatusGuides, StatusSchools } from '@prisma/client';
import { CustomContext } from './context';
import Container from 'react-bootstrap/esm/Container';
import { SelectNewCities } from '@/components/SettingsPage/components/SelectNewCities';
import { getAllDistances } from '@/db/instructorsrequest';
import { SelectDeleteCities } from '@/components/SettingsPage/components/SelectDeleteCities';
import { StatusContext } from '@/context/StatusContext';

// ייבוא הפונקציות מהנתיב המתוקן
import { updateInstructorsCreds, updatePeopleCreds, updateProposalCreds } from '@/util/localServerRequests'; 

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

// --- עיצוב Select מוקטן וקומפקטי ---
const purpleSelectStyles: StylesConfig = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#f5f3ff', 
        borderColor: '#ddd6fe',
        boxShadow: 'none',
        borderRadius: '0.5rem',
        minHeight: '36px',      
        height: '36px',
        width: '100%', 
        color: '#5b21b6',
        fontSize: '0.875rem',   
        transition: 'all 300ms',
        '&:hover': { borderColor: '#8b5cf6', backgroundColor: '#ede9fe' }
    }),
    valueContainer: (base) => ({
        ...base,
        padding: '0 8px',
        height: '36px',
    }),
    input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
    }),
    menu: (provided) => ({
            ...provided,
            zIndex: 9999,
            borderRadius: '0.5rem',
            overflow: 'hidden',
            backgroundColor: '#f5f3ff',
            border: '1px solid #ddd6fe',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }),
    menuPortal: (base) => ({ 
        ...base, 
        zIndex: 9999 
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#8b5cf6' : (state.isFocused ? '#ddd6fe' : '#f5f3ff'),
        color: state.isSelected ? 'white' : '#5b21b6',
        cursor: 'pointer',
        padding: '6px 10px',
        fontSize: '0.875rem',
    }),
    singleValue: (base) => ({ ...base, color: '#5b21b6', fontWeight: '600' }),
    placeholder: (base) => ({ ...base, color: '#a78bfa' }),
    dropdownIndicator: (base) => ({ ...base, color: '#8b5cf6', padding: '4px' }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: '#ddd6fe', marginTop: '6px', marginBottom: '6px' }),
};

// --- משתני עיצוב לכפתורי הטורקיז ---
const turquoiseTheme = {
  bg: 'bg-teal-50',            
  text: 'text-teal-900',       
  border: 'border-teal-200',   
  hover: 'hover:bg-teal-100',  
  active: 'bg-teal-100',       
  activeBorder: 'border-teal-400', 
  formBg: 'bg-teal-50/50'      
};

// --- משתני עיצוב לכפתורי הגוגל ---
const googleTheme = {
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-100',
};

const SettingsPage = () => {

  // --- States ---
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
  
  // סטייט לניהול מצב טעינה מול גוגל
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

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

  // --- Data Fetching ---
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
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      getFromStorage().then(({ Years, ProgramsStatuses }: DataType) => {
        if (Years && ProgramStatuses) {
          setYears(Years);
          setProgramStatuses(ProgramStatuses)

          const yearOptions = Years.map(year => ({ label: year.YearName, value: year.YearName }));
          yearOptions.push({ label: "הכל", value: undefined });
          setYearOptions(yearOptions);
          const initialSelectedYearOption = yearOptions.find(option => option.value === selectedYear) || { label: "הכל", value: undefined };
          setSelectedYearOption(initialSelectedYearOption);

          const statusOptions = ProgramsStatuses.map(status => ({ label: status.StatusName, value: status.StatusName }));
          statusOptions.push({ label: "הכל", value: undefined });
          setStatusOptions(statusOptions);
          const initialSelectedStatusOption = statusOptions.find(option => option.value === defaultStatus) || { label: "הכל", value: undefined };
          setSelectedStatusOption(initialSelectedStatusOption);

        } else {
          Promise.all([getAllYears(), getAllStatuses("Programs")]).then(([Years, Statuses]) => {
            setYears(Years);
            setProgramStatuses(Statuses)

            const yearOptions = Years.map(year => ({ label: year.YearName, value: year.YearName }));
            yearOptions.push({ label: "הכל", value: undefined });
            setYearOptions(yearOptions);
            const initialSelectedYearOption = yearOptions.find(option => option.value === selectedYear) || { label: "הכל", value: undefined };
            setSelectedYearOption(initialSelectedYearOption);

            const statusOptions = Statuses.map(status => ({ label: status.StatusName, value: status.StatusName }));
            statusOptions.push({ label: "הכל", value: undefined });
            setStatusOptions(statusOptions);
            const initialSelectedStatusOption = statusOptions.find(option => option.value === defaultStatus) || { label: "הכל", value: undefined };
            setSelectedStatusOption(initialSelectedStatusOption);

            updateStorage({ Years: Years, ProgramsStatuses: Statuses });
          })
        }
      })
    }
    fetchData();
  }, []);

  const toggleForm = (formName: OptionsNamed) => {
    setShowForms((prev) => ({ ...prev, [formName]: !prev[formName] }));
  };

  const handleYearChange = (selectedOption) => {
    changeYear(selectedOption.value);
    setSelectedYearOption(selectedOption)
  };

  const handleStatusChange = (selectedOption) => {
    changeStatus(selectedOption.value);
    setSelectedStatusOption(selectedOption)
  };

  const resetSettings = () => {
    setSelectedYearOption({ label: "הכל", value: undefined });
    changeYear(undefined);
    changeStatus(undefined)
    setSelectedStatusOption({ label: "הכל", value: undefined });
    closeAllForms();
  };

  // --- פונקציות טיפול בעדכון גוגל (חדש) ---
  const handleUpdateContacts = async () => {
      setIsLoadingGoogle(true);
      // @ts-ignore - במקרה שהקובץ TS לא עודכן עדיין, אנו מתעלמים משגיאת טייפסקריפט זמנית
      const result = await updatePeopleCreds();
      setIsLoadingGoogle(false);
      
      // תמיכה לאחור: אם עדיין מחזיר בוליאני
      const success = typeof result === 'object' ? result.success : result;
      const message = typeof result === 'object' ? result.message : '';

      if (success) {
          alert(`העדכון הצליח!${message ? `\nחשבון מחובר: ${message}` : ''}`);
      } else {
          alert(`העדכון נכשל.${message ? `\nפרטי שגיאה: ${message}` : '\nבדוק את החיבור לשרת.'}`);
      }
  };

  const handleUpdateInstructors = async () => {
      setIsLoadingGoogle(true);
      // @ts-ignore
      const result = await updateInstructorsCreds();
      setIsLoadingGoogle(false);

      const success = typeof result === 'object' ? result.success : result;
      const message = typeof result === 'object' ? result.message : '';

      if (success) {
          alert(`העדכון הצליח!${message ? `\nחשבון מחובר: ${message}` : ''}`);
      } else {
          alert(`העדכון נכשל.${message ? `\nפרטי שגיאה: ${message}` : '\nבדוק את החיבור לשרת.'}`);
      }
  };

  const handleUpdateProposal = async () => {
      setIsLoadingGoogle(true);
      // @ts-ignore
      const result = await updateProposalCreds();
      setIsLoadingGoogle(false);

      const success = typeof result === 'object' ? result.success : result;
      const message = typeof result === 'object' ? result.message : '';

      if (success) {
          alert(`העדכון הצליח!${message ? `\nחשבון מחובר: ${message}` : ''}`);
      } else {
          alert(`העדכון נכשל.${message ? `\nפרטי שגיאה: ${message}` : '\nבדוק את החיבור לשרת.'}`);
      }
  };
  // -----------------------------------------

  const closeAllForms = () => {
    Object.keys(showForms).forEach((formName: OptionsNamed) => {
      if (showForms[formName]) toggleForm(formName);
    });
  };

  const settingsButtons = [
    { key: 'cities', label: 'ערים', component: <><SelectNewCities Cities={Cities} Distances={Distances} setCities={setCities} /><SelectDeleteCities Cities={Cities} Distances={Distances} setCities={setCities} /></> },
    { key: 'areas', label: 'אזורים', formProps: { collectionName: "Areas", idFieldName: "Areaid", nameFieldName: "AreaName", placeHolder: 'הוסף אזור' } },
    { key: 'religionSectors', label: 'מגזרים', formProps: { collectionName: "ReligionSector", idFieldName: "Religionid", nameFieldName: "ReligionName", placeHolder: 'הוסף מגזר' } },
    { key: 'educationStages', label: 'שלבי חינוך', formProps: { collectionName: "EducationStage", idFieldName: "StageId", nameFieldName: "StageName", placeHolder: 'הוסף שלב חינוך' } },
    { key: 'schoolTypes', label: 'סוגי בית ספר', formProps: { collectionName: "SchoolTypes", idFieldName: "TypeId", nameFieldName: "TypeName", placeHolder: 'הוסף סוג ב"ס' } },
    { key: 'ContactStatuses', label: 'סטטוס א.קשר', formProps: { collectionName: "StatusContacts", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף סטטוס' } },
    { key: 'GuideStatuses', label: 'סטטוס מדריכים', formProps: { collectionName: "StatusGuides", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף סטטוס' } },
    { key: 'ProgramStatuses', label: 'סטטוס תוכניות', formProps: { collectionName: "StatusPrograms", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף סטטוס' } },
    { key: 'SchoolStatuses', label: 'סטטוס בתי ספר', formProps: { collectionName: "StatusSchools", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף סטטוס' } },
    { key: 'products', label: 'מוצרים', formProps: { collectionName: "ProductTypes", idFieldName: "ProductId", nameFieldName: "ProductName", placeHolder: 'הוסף מוצר' } },
    { key: 'years', label: 'שנים', formProps: { collectionName: "Years", idFieldName: "YearId", nameFieldName: "YearName", placeHolder: 'הוסף שנה' } },
    { key: 'roles', label: 'תפקידים', formProps: { collectionName: "Role", idFieldName: "RoleId", nameFieldName: "RoleName", placeHolder: 'הוסף תפקיד' } },
    { key: 'orders', label: 'הזמנות', formProps: { collectionName: "Orders", idFieldName: "OrderId", nameFieldName: "OrderName", placeHolder: 'הוסף הזמנה' } },
  ];

  return (
    <CustomContext.Provider
      value={{
        Roles, Years, ProductTypes, Types, Stages, Religion, Areas, Cities,
        SchoolStatuses, ProgramStatuses, ContactsStatuses, GuidesStatuses, Orders, Distances,
        setRoles, setYears, setProductTypes, setTypes, setStages, setReligion, setAreas, setCities,
        setSchoolStatuses, setProgramStatuses, setContactsStatuses, setGuidesStatuses, setOrders, setDistances
      }}
    >
      <div className="bg-slate-50 min-h-screen p-3" dir="rtl">
        <Container fluid>

          <header className="mb-6">
             <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-violet-600 to-teal-600 tracking-tight drop-shadow-sm pb-1">
                הגדרות מערכת
             </h1>
          </header>

          {/* כרטיסייה 1: הגדרות ברירת מחדל */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 mb-3 relative z-20">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2 justify-start">
              <span className="w-1.5 h-6 bg-violet-400 rounded-full"></span>
              הגדרות ברירת מחדל
            </h2>

            <div className="flex flex-wrap items-end gap-4">
              
              <div className="w-48"> 
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  שנה ברירת מחדל
                </label>
                <Select
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  styles={purpleSelectStyles}
                  options={yearOptions}
                  value={selectedYearOption}
                  placeholder="בחר שנה..."
                  onChange={handleYearChange}
                />
              </div>

              <div className="w-48">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  סטטוס ברירת מחדל
                </label>
                <Select
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  styles={purpleSelectStyles}
                  options={statusOptions}
                  value={selectedStatusOption}
                  placeholder="בחר סטטוס..."
                  onChange={handleStatusChange}
                />
              </div>

              <div className="w-32">
                <button
                  className="w-full bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200 font-bold py-1.5 px-3 rounded-lg text-xs transition-all duration-300 shadow-sm h-[36px]"
                  onClick={resetSettings}
                >
                  איפוס
                </button>
              </div>

            </div>
          </div>

          {/* כרטיסייה 2: עדכון חשבון גוגל (חדש) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 mb-3 relative z-10">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2 justify-start">
                <span className="w-1.5 h-6 bg-orange-400 rounded-full"></span>
                עדכון חשבון גוגל
            </h2>
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleUpdateContacts}
                    disabled={isLoadingGoogle}
                    className={`${googleTheme.bg} ${googleTheme.text} ${googleTheme.border} ${googleTheme.hover} border font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoadingGoogle ? 'מעדכן...' : 'עדכון אנשי קשר'}
                </button>
                <button
                    onClick={handleUpdateInstructors}
                    disabled={isLoadingGoogle}
                    className={`${googleTheme.bg} ${googleTheme.text} ${googleTheme.border} ${googleTheme.hover} border font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoadingGoogle ? 'מעדכן...' : 'עדכון מדריכים'}
                </button>
                <button
                    onClick={handleUpdateProposal}
                    disabled={isLoadingGoogle}
                    className={`${googleTheme.bg} ${googleTheme.text} ${googleTheme.border} ${googleTheme.hover} border font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoadingGoogle ? 'מעדכן...' : 'עדכון הצעות מחיר'}
                </button>
            </div>
          </div>

          {/* כרטיסייה 3: ניהול טבלאות נתונים */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 relative z-10">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2 justify-start">
                <span className="w-1.5 h-6 bg-teal-400 rounded-full"></span>
                עדכון וניהול טבלאות נתונים
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

              {settingsButtons.map((btn) => {
                const isOpen = showForms[btn.key as OptionsNamed];

                return (
                  <div key={btn.key} className={`col-span-1 transition-all duration-300 ease-in-out`}>

                    <button
                      onClick={() => toggleForm(btn.key as OptionsNamed)}
                      className={`w-full py-2 px-3 rounded-xl font-bold transition-all shadow-sm flex justify-between items-center border text-sm
                        ${isOpen
                          ? `${turquoiseTheme.active} ${turquoiseTheme.text} ${turquoiseTheme.activeBorder} shadow-md`
                          : `${turquoiseTheme.bg} ${turquoiseTheme.text} ${turquoiseTheme.border} ${turquoiseTheme.hover} hover:shadow-md`
                        }`}
                    >
                      <span className="truncate">{btn.label}</span>
                      <span className={`text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`}>▼</span>
                    </button>

                    {isOpen && (
                      <div className={`mt-2 ${turquoiseTheme.formBg} p-3 rounded-xl border ${turquoiseTheme.activeBorder} animate-fadeIn shadow-inner relative z-0`}>
                        {btn.component ? btn.component : (
                          <AddNamesForm
                            collectionName={btn.formProps.collectionName}
                            idFieldName={btn.formProps.idFieldName}
                            nameFieldName={btn.formProps.nameFieldName}
                            onClose={() => {
                              toggleForm(btn.key as OptionsNamed);
                              setFormUpdate((prev) => !prev);
                            }}
                            placeHolder={btn.formProps.placeHolder}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            </div>
          </div>

        </Container>
      </div>
    </CustomContext.Provider>
  );
};

export default SettingsPage;