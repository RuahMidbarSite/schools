"use client"
import React, { createContext, useContext, useEffect, useState } from 'react';
import AddNamesForm from '../../components/AddNamesForm/AddNamesForm';
import Select, { StylesConfig } from 'react-select'
import { YearContext } from '@/context/YearContext';
// הוספנו את updateStorage ואת פונקציות השרת החסרות
import { DataType, getFromStorage, updateStorage } from '@/components/SettingsPage/Storage/Storage/SettingsDataStorage';
import { getAllCities, getAllDistricts, getAllReligionSectors, getAllSchoolsTypes, getAllStatuses, getAllYears, getEducationStages, getOrders, getProductTypes, getRoles } from '@/db/generalrequests';
import { getAllDistances } from '@/db/instructorsrequest'; 
import { Areas, Cities, Distances, EducationStage, ProductTypes, ReligionSector, Role, SchoolTypes, Years, Orders, StatusPrograms, StatusContacts, StatusGuides, StatusSchools } from '@prisma/client';
import { CustomContext } from './context';
import { SelectNewCities } from '@/components/SettingsPage/components/SelectNewCities';
import { SelectDeleteCities } from '@/components/SettingsPage/components/SelectDeleteCities';
import { StatusContext } from '@/context/StatusContext';

type OptionsPage = {
  cities: false; areas?: false; religionSectors: false; educationStages: false;
  SchoolStatuses: false; ProgramStatuses: false; ContactStatuses: false;
  GuideStatuses: false; schoolTypes: false; products: false; years: false;
  roles: false; orders: false;
};
type OptionsNamed = keyof OptionsPage

const purpleSelectStyles: StylesConfig = {
    control: (base) => ({
        ...base, backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', borderRadius: '0.5rem',
        minHeight: '32px', height: '32px', fontSize: '0.9rem', fontWeight: '700',
        display: 'flex', flexDirection: 'row-reverse', justifyContent: 'flex-start',
    }),
    valueContainer: (base) => ({ ...base, padding: '0 4px', display: 'flex', justifyContent: 'flex-start' }),
    indicatorsContainer: (base) => ({ ...base, padding: '0' }),
    dropdownIndicator: (base) => ({ ...base, padding: '0 2px' }),
    indicatorSeparator: () => ({ display: 'none' }),
    singleValue: (base) => ({ ...base, color: '#5b21b6', margin: '0 4px' }),
};

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

  const [yearOptions, setYearOptions] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([])
  const { selectedYear, changeYear } = useContext(YearContext)
  const { defaultStatus, changeStatus } = useContext(StatusContext)
  const [showForms, setShowForms] = useState<OptionsPage>({
    cities: false, areas: false, religionSectors: false, educationStages: false,
    SchoolStatuses: false, ProgramStatuses: false, ContactStatuses: false,
    GuideStatuses: false, schoolTypes: false, products: false, years: false,
    roles: false, orders: false
  });

  const [loadingType, setLoadingType] = useState<string | null>(null);

  // --- התיקון המרכזי בלוגיקה ---
  useEffect(() => {
    const fetchData = async () => {
        try {
            // קודם כל מנסים לקחת מהזיכרון
            const data: DataType = await getFromStorage();

            // אם יש מידע בזיכרון, נשתמש בו
            if (data && data.Role && data.Years) {
                console.log("Loading from storage...");
                setRoles(data.Role); setYears(data.Years); setProductTypes(data.ProductTypes);
                setTypes(data.SchoolTypes); setStages(data.Stages); setReligion(data.Religion);
                setAreas(data.Areas); setCities(data.Cities); setProgramStatuses(data.ProgramsStatuses);
                setSchoolStatuses(data.SchoolStatuses); setGuidesStatuses(data.GuidesStatuses);
                setContactsStatuses(data.ContactsStatuses); setDistances(data.Distances); setOrders(data.Orders);
                
                if (data.Years) setYearOptions([...data.Years.map(y => ({ label: y.YearName, value: y.YearName })), { label: "הכל", value: undefined }]);
                if (data.ProgramsStatuses) setStatusOptions([...data.ProgramsStatuses.map(s => ({ label: s.StatusName, value: s.StatusName })), { label: "הכל", value: undefined }]);
            } 
            else {
                // אחרת (התיקון): מושכים מהשרת
                console.log("Storage empty, fetching from Server...");
                const [
                    fetchedRoles, fetchedYears, fetchedProducts, fetchedTypes, fetchedStages, 
                    fetchedReligion, fetchedAreas, fetchedCities, fetchedContactStatus, 
                    fetchedProgramStatus, fetchedGuideStatus, fetchedSchoolStatus, 
                    fetchedDistances, fetchedOrders
                 ] = await Promise.all([
                    getRoles(), getAllYears(), getProductTypes(), getAllSchoolsTypes(), getEducationStages(),
                    getAllReligionSectors(), getAllDistricts(), getAllCities(), getAllStatuses("Contacts"),
                    getAllStatuses("Programs"), getAllStatuses("Guides"), getAllStatuses("Schools"),
                    getAllDistances(), getOrders()
                 ]);

                 setRoles(fetchedRoles);
                 setYears(fetchedYears);
                 setProductTypes(fetchedProducts);
                 setTypes(fetchedTypes);
                 setStages(fetchedStages);
                 setReligion(fetchedReligion);
                 setAreas(fetchedAreas);
                 setCities(fetchedCities);
                 setContactsStatuses(fetchedContactStatus as StatusContacts[]);
                 setProgramStatuses(fetchedProgramStatus as StatusPrograms[]);
                 setGuidesStatuses(fetchedGuideStatus as StatusGuides[]);
                 setSchoolStatuses(fetchedSchoolStatus as StatusSchools[]);
                 setDistances(fetchedDistances);
                 setOrders(fetchedOrders);

                 // עדכון הסלקטים
                 const yOpts = [...fetchedYears.map(y => ({ label: y.YearName, value: y.YearName })), { label: "הכל", value: undefined }];
                 setYearOptions(yOpts);
                 const sOpts = [...(fetchedProgramStatus as StatusPrograms[]).map(s => ({ label: s.StatusName, value: s.StatusName })), { label: "הכל", value: undefined }];
                 setStatusOptions(sOpts);

                 // שמירה בזיכרון לפעם הבאה
                 updateStorage({
                    Role: fetchedRoles, Years: fetchedYears, ProductTypes: fetchedProducts, SchoolTypes: fetchedTypes, 
                    Stages: fetchedStages, Religion: fetchedReligion, Areas: fetchedAreas, Cities: fetchedCities,
                    SchoolStatuses: fetchedSchoolStatus as StatusSchools[], ProgramsStatuses: fetchedProgramStatus as StatusPrograms[], 
                    GuidesStatuses: fetchedGuideStatus as StatusGuides[], ContactsStatuses: fetchedContactStatus as StatusContacts[], 
                    Distances: fetchedDistances, Orders: fetchedOrders
                 });
            }
        } catch (err) {
            console.error("Error loading settings:", err);
        }
    };
    fetchData();
  }, []);

  const isConnected = (type: string) => (typeof window !== "undefined") ? !!localStorage.getItem(`google_token_${type}`) : false;

  const handleDisconnect = (type: string) => {
    localStorage.removeItem(`google_token_${type}`);
    window.location.reload();
  };

  // פונקציית פתיחת חלון גוגל כ-Pop-up (חלון צף)
  const triggerGoogleAuth = (type: string) => {
    setLoadingType(type);
    const baseUrl = window.location.origin;
    const state = encodeURIComponent(JSON.stringify({ page_redirect: window.location.href, redirecttype: type }));
    const clientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientID}&redirect_uri=${baseUrl}/api/GoogleAuth&response_type=code&scope=https://www.googleapis.com/auth/drive.file&state=${state}&prompt=select_account`;
    
    // הגדרות מימדים ומיקום למרכז המסך
    const width = 500;
    const height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(authUrl, 'GoogleAuth', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`);
    
    setTimeout(() => setLoadingType(null), 2000);
  };

  const toggleForm = (formName: OptionsNamed) => {
    setShowForms((prev) => {
        const newState = Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {} as OptionsPage);
        return { ...newState, [formName]: !prev[formName] };
    });
  };

  // הוספתי "|| []" כדי למנוע קריסה כשהמידע עוד לא נטען
  const settingsButtons = [
    { key: 'cities', label: 'ערים', component: <><SelectNewCities Cities={Cities || []}  setCities={setCities} /><SelectDeleteCities Cities={Cities || []} Distances={Distances || []} setCities={setCities} /></> },
    { key: 'areas', label: 'אזורים', formProps: { collectionName: "Areas", idFieldName: "Areaid", nameFieldName: "AreaName", placeHolder: 'הוסף...' } },
    { key: 'religionSectors', label: 'מגזרים', formProps: { collectionName: "ReligionSector", idFieldName: "Religionid", nameFieldName: "ReligionName", placeHolder: 'הוסף...' } },
    { key: 'educationStages', label: 'שלבי חינוך', formProps: { collectionName: "EducationStage", idFieldName: "StageId", nameFieldName: "StageName", placeHolder: 'הוסף...' } },
    { key: 'schoolTypes', label: 'סוגי בית ספר', formProps: { collectionName: "SchoolTypes", idFieldName: "TypeId", nameFieldName: "TypeName", placeHolder: 'הוסף...' } },
    { key: 'ContactStatuses', label: 'סטטוס אנשי קשר', formProps: { collectionName: "StatusContacts", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף...' } },
    { key: 'GuideStatuses', label: 'סטטוס מדריכים', formProps: { collectionName: "StatusGuides", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף...' } },
    { key: 'ProgramStatuses', label: 'סטטוס תוכניות', formProps: { collectionName: "StatusPrograms", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף...' } },
    { key: 'SchoolStatuses', label: 'סטטוס בתי ספר', formProps: { collectionName: "StatusSchools", idFieldName: "StatusId", nameFieldName: "StatusName", placeHolder: 'הוסף...' } },
    { key: 'products', label: 'מוצרים', formProps: { collectionName: "ProductTypes", idFieldName: "ProductId", nameFieldName: "ProductName", placeHolder: 'הוסף...' } },
    { key: 'years', label: 'שנים', formProps: { collectionName: "Years", idFieldName: "YearId", nameFieldName: "YearName", placeHolder: 'הוסף...' } },
    { key: 'roles', label: 'תפקידים', formProps: { collectionName: "Role", idFieldName: "RoleId", nameFieldName: "RoleName", placeHolder: 'הוסף...' } },
    { key: 'orders', label: 'הזמנות', formProps: { collectionName: "Orders", idFieldName: "OrderId", nameFieldName: "OrderName", placeHolder: 'הוסף...' } },
  ];

  return (
    <CustomContext.Provider value={{ Roles, Years, ProductTypes, Types, Stages, Religion, Areas, Cities, SchoolStatuses, ProgramStatuses, ContactsStatuses, GuidesStatuses, Orders, Distances }}>
      <div className="bg-slate-50 min-h-screen p-4 w-full flex flex-col gap-6" dir="rtl">
          
          <div className="w-full flex gap-6 items-start">
              {/* טור ימני: כותרת + הגדרות ברירת מחדל */}
              <aside className="flex flex-col gap-6 min-w-[220px]">
                  <div className="text-right pr-2">
                      <h1 className="text-3xl font-black text-teal-800 tracking-tight mb-1">הגדרות מערכת</h1>
                      <div className="h-1.5 w-16 bg-teal-500 rounded-full"></div>
                  </div>

                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
                      <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 border-b pb-2">
                          <span className="w-1 h-5 bg-violet-400 rounded-full"></span>הגדרות ברירת מחדל
                      </h2>
                      <div className="flex flex-col gap-4">
                          <div className="w-full">
                              <label className="block text-xs font-bold text-slate-500 mb-1 text-right">שנה ברירת מחדל</label>
                              <Select styles={purpleSelectStyles} options={yearOptions} value={yearOptions.find(o => o.value === selectedYear)} onChange={(v: any) => changeYear(v.value)} />
                          </div>
                          <div className="w-full">
                              <label className="block text-xs font-bold text-slate-500 mb-1 text-right">סטטוס ברירת מחדל</label>
                              <Select styles={purpleSelectStyles} options={statusOptions} value={statusOptions.find(o => o.value === defaultStatus)} onChange={(v: any) => changeStatus(v.value)} />
                          </div>
                          <button className="bg-violet-100 text-violet-800 px-4 py-2 rounded-xl text-xs font-bold w-full hover:bg-violet-200 mt-2 transition-all" onClick={() => { changeYear(undefined); changeStatus(undefined); }}>איפוס הגדרות</button>
                      </div>
                  </section>
              </aside>

              <div className="flex-1 flex flex-col gap-8">
                  {/* ניהול טבלאות נתונים - כפתורים צמודים לימין */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 relative z-[100]">
                      <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                          <span className="w-1.5 h-6 bg-teal-400 rounded-full"></span>ניהול טבלאות נתונים
                      </h2>
                      <div className="flex flex-wrap justify-start items-start gap-2 max-w-full">
                        {settingsButtons.map((btn, index) => {
                          const isOpen = showForms[btn.key as OptionsNamed];
                          const isLeftSide = (index + 1) % 5 === 0 || (index + 1) % 5 === 4; // פתיחה חכמה למניעת חיתוך
                          
                          return (
                              <div key={btn.key} className="w-fit">
                                  <button 
                                      onClick={() => toggleForm(btn.key as OptionsNamed)} 
                                      className={`py-3 px-3 rounded-xl font-bold transition-all border text-sm flex items-center justify-start gap-1 shadow-sm w-fit min-w-[135px] ${isOpen ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-teal-50 text-teal-900 border-teal-100 hover:bg-teal-100'}`}
                                  >
                                      <span className={`text-[10px] opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                                      <span className="truncate leading-none mr-1">{btn.label}</span>
                                  </button>
                                  {isOpen && (
                                      <div className={`absolute top-full z-[1000] mt-4 bg-white p-8 rounded-3xl border border-teal-200 shadow-2xl animate-fadeIn w-[750px] ${isLeftSide ? 'left-0' : 'right-0'}`} style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                                          <div className="flex justify-between items-center mb-6 border-b pb-3 font-sans">
                                              <span className="font-bold text-2xl text-teal-800 tracking-tight">ניהול {btn.label}</span>
                                              <button onClick={() => toggleForm(btn.key as OptionsNamed)} className="text-slate-400 hover:text-red-500 text-3xl font-bold leading-none">×</button>
                                          </div>
                                          <div className="w-full h-fit">{btn.component || <AddNamesForm collectionName={btn.formProps!.collectionName} idFieldName={btn.formProps!.idFieldName} nameFieldName={btn.formProps!.nameFieldName} onClose={() => toggleForm(btn.key as OptionsNamed)} placeHolder={btn.formProps!.placeHolder} />}</div>
                                      </div>
                                  )}
                              </div>
                          );
                        })}
                      </div>
                  </section>

                  {/* עדכון חשבון גוגל - מיושר וגדול */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-fit font-sans">
                      <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                          <span className="w-1.5 h-6 bg-orange-400 rounded-full"></span>עדכון חשבון גוגל
                      </h2>
                      <div className="flex justify-start gap-4">
                          {[
                            { label: 'אנשי קשר', type: 'Guide' },
                            { label: 'מדריכים', type: 'Program' },
                            { label: 'הצעות מחיר', type: 'School' }
                          ].map((item) => (
                              <div key={item.type} className="text-center text-nowrap">
                                  <button onClick={() => triggerGoogleAuth(item.type)} className={`min-w-[150px] font-bold py-3.5 px-6 rounded-2xl text-sm transition-all border shadow-sm ${loadingType === item.type ? 'bg-slate-100 text-slate-400 cursor-wait' : isConnected(item.type) ? 'bg-green-50 text-green-700 border-green-200 shadow-inner' : 'bg-orange-50 text-orange-900 border-orange-100 hover:bg-orange-100 active:scale-95'}`}>
                                          {loadingType === item.type ? 'טוען...' : isConnected(item.type) ? `✅ ${item.label.split(' ').pop()}` : item.label}
                                  </button>
                                  {isConnected(item.type) && <button onClick={() => handleDisconnect(item.type)} className="text-red-500 text-[10px] underline mt-2 block w-full font-medium tracking-tight font-sans">נתק חשבון</button>}
                              </div>
                          ))}
                      </div>
                  </section>
              </div>
          </div>
      </div>
    </CustomContext.Provider>
  );
};

export default SettingsPage;