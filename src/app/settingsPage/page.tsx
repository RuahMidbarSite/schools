"use client"
import React, { createContext, useContext, useEffect, useState } from 'react';
import AddNamesForm from '../../components/AddNamesForm/AddNamesForm';
import Select, { StylesConfig } from 'react-select'
import { YearContext } from '@/context/YearContext';
import { DataType, getFromStorage, updateStorage } from '@/components/SettingsPage/Storage/Storage/SettingsDataStorage';
import { getAllCities, getAllDistricts, getAllReligionSectors, getAllSchoolsTypes, getAllStatuses, getAllYears, getEducationStages, getOrders, getProductTypes, getRoles, getAllProfessionTypes } from '@/db/generalrequests';
import { getAllDistances } from '@/db/instructorsrequest'; 
import { Areas, Cities, Distances, EducationStage, ProductTypes, ReligionSector, Role, SchoolTypes, Years, Orders, StatusPrograms, StatusContacts, StatusGuides, StatusSchools } from '@prisma/client';
import { CustomContext } from './context';
import { SelectNewCities } from '@/components/SettingsPage/components/SelectNewCities';
import { SelectDeleteCities } from '@/components/SettingsPage/components/SelectDeleteCities';
import { StatusContext } from '@/context/StatusContext';
import { useSettingsAuth } from '@/hooks/useSettingsAuth'; // ← Hook חדש

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
  // ← שימוש ב-Hook החדש
  const { isReady, requestToken } = useSettingsAuth();
  
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
  const [ProfessionTypes, setProfessionTypes] = useState<any[]>([])

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
  const [googleAccounts, setGoogleAccounts] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchData = async () => {
        try {
            const data: DataType = await getFromStorage();

            if (data && data.Role && data.Years) {
                console.log("Loading from storage...");
                setRoles(data.Role); setYears(data.Years); setProductTypes(data.ProductTypes);
                setTypes(data.SchoolTypes); setStages(data.Stages); setReligion(data.Religion);
                setAreas(data.Areas); setCities(data.Cities); setProgramStatuses(data.ProgramsStatuses);
                setSchoolStatuses(data.SchoolStatuses); setGuidesStatuses(data.GuidesStatuses);
                setContactsStatuses(data.ContactsStatuses); setDistances(data.Distances); setOrders(data.Orders);
                if (data.ProfessionTypes) setProfessionTypes(data.ProfessionTypes);
                
                if (data.Years) setYearOptions([...data.Years.map(y => ({ label: y.YearName, value: y.YearName })), { label: "הכל", value: undefined }]);
                if (data.ProgramsStatuses) setStatusOptions([...data.ProgramsStatuses.map(s => ({ label: s.StatusName, value: s.StatusName })), { label: "הכל", value: undefined }]);
            } 
            else {
                console.log("Storage empty, fetching from Server...");
                const [
                    fetchedRoles, fetchedYears, fetchedProducts, fetchedTypes, fetchedStages, 
                    fetchedReligion, fetchedAreas, fetchedCities, fetchedContactStatus, 
                    fetchedProgramStatus, fetchedGuideStatus, fetchedSchoolStatus, 
                    fetchedDistances, fetchedOrders, fetchedProfessionTypes
                 ] = await Promise.all([
                    getRoles(), getAllYears(), getProductTypes(), getAllSchoolsTypes(), getEducationStages(),
                    getAllReligionSectors(), getAllDistricts(), getAllCities(), getAllStatuses("Contacts"),
                    getAllStatuses("Programs"), getAllStatuses("Guides"), getAllStatuses("Schools"),
                    getAllDistances(), getOrders(), getAllProfessionTypes()
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
                 setProfessionTypes(fetchedProfessionTypes);

                 const yOpts = [...fetchedYears.map(y => ({ label: y.YearName, value: y.YearName })), { label: "הכל", value: undefined }];
                 setYearOptions(yOpts);
                 const sOpts = [...(fetchedProgramStatus as StatusPrograms[]).map(s => ({ label: s.StatusName, value: s.StatusName })), { label: "הכל", value: undefined }];
                 setStatusOptions(sOpts);

                 updateStorage({
                    Role: fetchedRoles, Years: fetchedYears, ProductTypes: fetchedProducts, SchoolTypes: fetchedTypes, 
                    Stages: fetchedStages, Religion: fetchedReligion, Areas: fetchedAreas, Cities: fetchedCities,
                    SchoolStatuses: fetchedSchoolStatus as StatusSchools[], ProgramsStatuses: fetchedProgramStatus as StatusPrograms[], 
                    GuidesStatuses: fetchedGuideStatus as StatusGuides[], ContactsStatuses: fetchedContactStatus as StatusContacts[], 
                    Distances: fetchedDistances, Orders: fetchedOrders, ProfessionTypes: fetchedProfessionTypes
                 });
            }
        } catch (err) {
            console.error("Error loading settings:", err);
        }
    };
    fetchData();
    
    loadGoogleAccounts();
  }, []);

  const loadGoogleAccounts = () => {
    if (typeof window === "undefined") return;
    
    const accounts: {[key: string]: string} = {};
    ['Guide', 'Program', 'School'].forEach(type => {
      const email = localStorage.getItem(`google_email_${type}`);
      if (email) accounts[type] = email;
    });
    setGoogleAccounts(accounts);
  };

  const isConnected = (type: string) => (typeof window !== "undefined") ? !!localStorage.getItem(`google_token_${type}`) : false;

  const handleDisconnect = (type: string) => {
    localStorage.removeItem(`google_token_${type}`);
    localStorage.removeItem(`google_email_${type}`);
    setGoogleAccounts(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  // ← פונקציה מעודכנת להשתמש ב-Hook
  const triggerGoogleAuth = (type: string) => {
    if (!isReady) {
      alert('Google SDK עדיין נטען, אנא המתן רגע ונסה שוב');
      return;
    }

    setLoadingType(type);

    requestToken(
      type,
      // onSuccess
      (tokenData) => {
        setLoadingType(null);
        
        // עדכון חשבונות
        if (tokenData.id_token) {
          try {
            const payload = JSON.parse(atob(tokenData.id_token.split('.')[1]));
            if (payload.email) {
              setGoogleAccounts(prev => ({ ...prev, [type]: payload.email }));
            }
          } catch (e) {
            console.error('Failed to parse token:', e);
          }
        }
        
        alert('✅ חשבון Google חובר בהצלחה!');
      },
      // onError
      (error) => {
        setLoadingType(null);
        console.error('Auth error:', error);
        alert(`❌ שגיאה באימות: ${error.message || 'שגיאה לא ידועה'}`);
      }
    );
  };

  const toggleForm = (formName: OptionsNamed) => {
    setShowForms((prev) => {
        const newState = Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {} as OptionsPage);
        return { ...newState, [formName]: !prev[formName] };
    });
  };

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
    { 
      key: 'professions', 
      label: 'מקצועות', 
      formProps: { 
        collectionName: "ProfessionTypes", 
        idFieldName: "ProfessionId", 
        nameFieldName: "ProfessionName", 
        placeHolder: 'הוסף מקצוע...',
        additionalFields: { FieldName: `ID_${Date.now()}` } // מונע כפילויות במונגו
      } 
    },
    { key: 'products', label: 'מוצרים', formProps: { collectionName: "ProductTypes", idFieldName: "ProductId", nameFieldName: "ProductName", placeHolder: 'הוסף...' } },
    { key: 'years', label: 'שנים', formProps: { collectionName: "Years", idFieldName: "YearId", nameFieldName: "YearName", placeHolder: 'הוסף...' } },
    { key: 'roles', label: 'תפקידים', formProps: { collectionName: "Role", idFieldName: "RoleId", nameFieldName: "RoleName", placeHolder: 'הוסף...' } },
    { key: 'orders', label: 'הזמנות', formProps: { collectionName: "Orders", idFieldName: "OrderId", nameFieldName: "OrderName", placeHolder: 'הוסף...' } },
  ];

  return (
    <CustomContext.Provider value={{ Roles, Years, ProductTypes, Types, Stages, Religion, Areas, Cities, SchoolStatuses, ProgramStatuses, ContactsStatuses, GuidesStatuses, Orders, Distances, ProfessionTypes, setProfessionTypes }}>
      <div className="bg-slate-50 min-h-screen p-4 w-full flex flex-col gap-6" dir="rtl">
          
          <div className="w-full flex gap-6 items-start">
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
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 relative z-[100]">
                      <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                          <span className="w-1.5 h-6 bg-teal-400 rounded-full"></span>ניהול טבלאות נתונים
                      </h2>
                      <div className="flex flex-wrap justify-start items-start gap-2 max-w-full">
                        {settingsButtons.map((btn, index) => {
                          const isOpen = showForms[btn.key as OptionsNamed];
                          const isLeftSide = (index + 1) % 5 === 0 || (index + 1) % 5 === 4;
                          
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

                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-fit font-sans">
                      <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                          <span className="w-1.5 h-6 bg-orange-400 rounded-full"></span>עדכון חשבון גוגל
                      </h2>
                      <div className="flex justify-start gap-4">
                          {[
                            { label: 'אנשי קשר', type: 'Guide', description: 'עבור דף אנשי קשר ובתי ספר' },
                            { label: 'מדריכים', type: 'Program', description: 'עבור דף מדריכים' },
                            { label: 'הצעות מחיר', type: 'School', description: 'עבור הצעות מחיר' }
                          ].map((item) => (
                              <div key={item.type} className="flex flex-col items-center">
                                  <button 
                                      onClick={() => triggerGoogleAuth(item.type)} 
                                      className={`min-w-[170px] font-bold py-3.5 px-6 rounded-2xl text-sm transition-all border shadow-sm ${
                                        loadingType === item.type 
                                          ? 'bg-slate-100 text-slate-400 cursor-wait' 
                                          : isConnected(item.type) 
                                            ? 'bg-green-50 text-green-700 border-green-200 shadow-inner' 
                                            : 'bg-orange-50 text-orange-900 border-orange-100 hover:bg-orange-100 active:scale-95'
                                      }`}
                                      disabled={loadingType === item.type || !isReady}
                                  >
                                      {loadingType === item.type ? 'טוען...' : isConnected(item.type) ? `✅ מחובר` : `🔗 ${item.label}`}
                                  </button>
                                  
                                  <div className="mt-2 text-xs text-center min-h-[40px]">
                                      {isConnected(item.type) && googleAccounts[item.type] && (
                                          <div className="flex flex-col gap-1">
                                              <span className="text-green-600 font-semibold truncate max-w-[170px]" title={googleAccounts[item.type]}>
                                                  {googleAccounts[item.type]}
                                              </span>
                                              <span className="text-slate-400 text-[10px]">{item.description}</span>
                                          </div>
                                      )}
                                      {!isConnected(item.type) && (
                                          <span className="text-slate-400 text-[10px]">{item.description}</span>
                                      )}
                                  </div>
                                  
                                  {isConnected(item.type) && (
                                      <button 
                                          onClick={() => handleDisconnect(item.type)} 
                                          className="text-red-500 text-[10px] underline mt-1 font-medium tracking-tight hover:text-red-700"
                                      >
                                          נתק חשבון
                                      </button>
                                  )}
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