"use client"
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { getPrograms } from '@/db/programsRequests';
import { School, Program, Payments, PendingPayments } from "@prisma/client";
import { getYears, getModelFields, getPayments } from '@/db/generalrequests';
import {
  getPendingPayments,
  updatePaymentColumn,
  addPaymentsRow,
  addPendingPaymentsRow,
  updatePendingPaymentColumn,
  deletePaymentRow,
  deletePendingPaymentRow
} from '@/db/paymentsRequests';
import { AgGridReact } from "ag-grid-react";
import Select from 'react-select'
import { CellValueChangedEvent, ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community';
import { OverlayTrigger, Tooltip, Row, Col, Button, Form, Container } from 'react-bootstrap';
import { FcAddRow } from 'react-icons/fc';
import { CustomDateCellEditor } from '@/components/Tables/GeneralFiles/Date/CustomDateCellEditor/CustomDateCellEditor';
import { getAllSchools, updateSchoolColumn } from '@/db/schoolrequests';
import { ThemeContext } from '@/context/Theme/Theme';
import { DataType, getFromStorage, getFromStorageWithKey, updateStorage } from '@/components/Tables/PricingTable/Storage/PricingDataStorage';
import { getAllContacts } from '@/db/contactsRequests';
import { useYear } from '@/context/YearContext';

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";


export const PaymentsTable = () => {

  const rolesDict = useMemo(() => ({
    budget: "תקציב",
    payments: "תשלומים",
    acounts: "חשבונות",
    funds: "כספים",
    treasurer: "גזבר",
    adminM: "מנהלן",
    adminF: "מנהלנית"
  }), [])

  const PaymentsRowCount = useRef(0);
  
  // State definitions
  const [schoolsData, setSchoolsData] = useState<School[]>([]);
  const [schoolsColDefs, setSchoolsColDefs] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState<School[]>()

  const [ProgramsData, setProgrmsData] = useState<Program[]>([]);
  const [programsColDefs, setProgramsColDefs] = useState([]);

  const [contactsData, setContactsData] = useState<any[]>([]);
  const [contactsColDefs, setContactsColDefs] = useState([]);

  const [pricingColDefs, setPricingColDefs] = useState([]);

  const [PaymentsData, setPaymentsData] = useState<Payments[]>([]);
  const [paymentsColDef, setPaymentsColDef] = useState<ColDef<Payments>[]>([]);

  const [pendingPaymentsData, setPendingPaymentsData] = useState<PendingPayments[]>([]);
  const [pendingPaymentsColDef, setPendingPaymentsColDef] = useState([]);

  const [yearOptions, setYearOptions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(useYear().selectedYear)
  const [selectedYearOption, setSelectedYearOption] = useState(null);

  const [selectedPrograms, setSelectedPrograms] = useState<Program[]>([]);
  const [selectedContacts, setSelectedContacts]: any = useState([]);
  const [selectedPayments, setSelectedPayments]: any = useState([]);
  const [selectedPendingPayments, setSelectedPendingPayments]: any = useState([]);
  const [selectedSchool, setSelectedSchool] = useState<School>()

  // School Filter State
  const [schoolFilterText, setSchoolFilterText] = useState(""); 

  const [totalPrice, setTotalPrice] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)

  // Refs
  const contactsGridRef: any = useRef(null);
  const programsGridRef: any = useRef(null);
  const pricingGridRef: any = useRef(null);
  const paymentsGridRef: any = useRef(null);
  const pendingPaymentsGridRef: any = useRef(null);
  const schoolsGridRef: any = useRef(null);

  const [textValue, setTextValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  const { theme } = useContext(ThemeContext)

  // --- 1. DEFAULT COL DEF ---
  const defaultColDef = useMemo(() => ({
    minWidth: 100, 
    sortable: true,
    filter: true,
    resizable: true, 
    flex: 1, 
  }), []);


  // --- 2. MANAGED STATE FUNCTIONS ---

  const onColumnEvent = useCallback((params) => {
      if (params.type === 'columnResized' && params.finished === false) return;
      
      let key = null;
      if(params.api === schoolsGridRef.current?.api) key = 'state_schools';
      else if(params.api === contactsGridRef.current?.api) key = 'state_contacts';
      else if(params.api === programsGridRef.current?.api) key = 'state_programs';
      else if(params.api === pricingGridRef.current?.api) key = 'state_pricing';
      else if(params.api === paymentsGridRef.current?.api) key = 'state_payments';
      else if(params.api === pendingPaymentsGridRef.current?.api) key = 'state_pending';

      if (key) {
          const colState = params.api.getColumnState();
          localStorage.setItem(key, JSON.stringify(colState));
      }
  }, []);

  const onFirstDataRendered = useCallback((params, key) => {
      const savedState = localStorage.getItem(key);
      if (savedState) {
          params.api.applyColumnState({
              state: JSON.parse(savedState),
              applyOrder: true
          });
      }
  }, []);

  // -----------------------------------------------------

  const CustomNoRowsOverlay = useCallback(() => {
    const Name = "לא זוהו נתונים"
    return (
      <div className="ag-overlay-no-rows-center text-blue-300">
        <span> {Name} </span>
      </div>
    );
  }, [])

  // --- NEW LOGIC: Calculate Totals and Splits (Annual, Omri, Mariana) ---
  const schoolsTotal = useMemo(() => {
    const isYearMatch = (rowYear) => !selectedYear || selectedYear === "הכל" || rowYear === selectedYear;

    // 1. Expected Income (Global only - Programs don't have issuer)
    const totalExpected = ProgramsData
      .filter(p => isYearMatch(p.Year))
      .reduce((sum, p) => sum + ((p.PaidLessonNumbers || 0) * (p.PricingPerPaidLesson || 0) + (p.AdditionalPayments || 0)), 0);

    // Helper to sum Paid Payments
    const sumPaid = (issuerName: string | null) => PaymentsData
      .filter(p => isYearMatch(p.Year))
      .filter(p => issuerName ? p.Issuer === issuerName : true)
      .reduce((sum, p) => sum + (p.Amount || 0), 0);

    // Helper to sum Pending Payments
    const sumPending = (issuerName: string | null) => pendingPaymentsData
      .filter(p => isYearMatch(p.Year))
      .filter(p => issuerName ? p.Issuer === issuerName : true)
      .reduce((sum, p) => sum + (p.Amount || 0), 0);

    const annualPaid = sumPaid(null);
    
    return {
      annual: {
        expected: totalExpected,
        paid: annualPaid,
        pending: sumPending(null),
        remaining: totalExpected - annualPaid
      },
      omri: {
        paid: sumPaid("עמרי"),
        pending: sumPending("עמרי")
      },
      mariana: {
        paid: sumPaid("מריאנה"),
        pending: sumPending("מריאנה")
      }
    };
  }, [ProgramsData, PaymentsData, pendingPaymentsData, selectedYear]);
  // --------------------------------------------------------------------


  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      getFromStorage().then(({ Programs, Schools, schoolsContacts, Payments, PendingPayments, Years }: DataType) => {
        if (Programs && Schools && schoolsContacts && Payments && PendingPayments && Years) {
          const formattedOptions = [{ label: 'הכל', value: undefined }].concat(Years.map(y => ({ label: y.YearName, value: y.YearName })));
          const initialSelectedOption = formattedOptions.find(option => option.value === selectedYear);
          let AllProgramsSchool = [...Programs.map((program) => program.Schoolid)]
          let AllSchoolsWithPrograms = Schools.filter((school) => AllProgramsSchool.includes(school.Schoolid))
          
          setProgrmsData(Programs)
          setSchoolsData(AllSchoolsWithPrograms)
          setSelectedSchools(AllSchoolsWithPrograms)
          setContactsData(schoolsContacts)
          setPaymentsData(Payments) // Initial load of ALL payments
          setPendingPaymentsData(PendingPayments)
          setYearOptions(formattedOptions);
          setSelectedYearOption(initialSelectedOption || { label: "הכל", value: undefined });
        }
        else {
          Promise.all([
            getPrograms(), getAllSchools(), getAllContacts(), getYears(), getPayments(), getPendingPayments()
          ]).then(([programsData, schoolsData, contacts, yearsData, paymentsData, pendingPaymentsData]) => {
            const formattedOptions = [{ label: 'הכל', value: undefined }].concat(yearsData.map(y => ({ label: y.YearName, value: y.YearName })));
            const initialSelectedOption = formattedOptions.find(option => option.value === selectedYear);
            let AllProgramsSchool = [...programsData.map((program) => program.Schoolid)]
            let AllSchoolsWithPrograms = schoolsData.filter((school) => AllProgramsSchool.includes(school.Schoolid))
            
            setProgrmsData(programsData)
            setSchoolsData(AllSchoolsWithPrograms)
            setSelectedSchools(AllSchoolsWithPrograms)
            setContactsData(contacts)
            setPaymentsData(paymentsData) // Initial load of ALL payments
            setPendingPaymentsData(pendingPaymentsData)
            setYearOptions(formattedOptions);
            setSelectedYearOption(initialSelectedOption || { label: "הכל", value: undefined });
            updateStorage({ Programs: programsData, Schools: schoolsData, schoolsContacts: contacts, Payments: paymentsData, Years: yearsData, PendingPayments: pendingPaymentsData })
          })
        }
      })
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TotalValueGetter = useCallback((params) => params.data.FreeLessonNumbers + params.data.PaidLessonNumbers, [])
  const FinalValueGetter = useCallback((params) => (params.data.PaidLessonNumbers * params.data.PricingPerPaidLesson) + params.data.AdditionalPayments, [])

  useEffect(() => {
    const updateSum = async () => {
      const totalPrice = Array.isArray(selectedPrograms) ? selectedPrograms.reduce((sum, obj) => sum + (obj.PaidLessonNumbers * obj.PricingPerPaidLesson + obj.AdditionalPayments), 0) : 0;
      const totalPayments = Array.isArray(selectedPayments) ? selectedPayments.reduce((sum, obj) => sum + obj.Amount, 0) : 0;
      setTotalPrice(totalPrice);
      setTotalPayments(totalPayments);
    };
    updateSum();
  }, [selectedPrograms, selectedPayments]);

  useEffect(() => {
    const filterPrograms = () => {
      let filteredPrograms = [...ProgramsData]
      if (selectedSchool) {
        filteredPrograms = ProgramsData.filter(program => program.Schoolid === selectedSchool?.Schoolid)
      }
      const YearFilter = filteredPrograms.filter((program) => {
        if (selectedYear === "הכל" || selectedYear === undefined) return true;
        else return program.Year === selectedYear;
      })
      const schools_after_filter = YearFilter.map((program) => program.Schoolid)
      const SchoolYearFilter = [...schoolsData].filter((school) => schools_after_filter.includes(school.Schoolid))
      
      if (selectedSchool) setSelectedPrograms(YearFilter)
      setSelectedSchools(SchoolYearFilter)
    }
    filterPrograms()
  }, [selectedYear, selectedSchool, ProgramsData, schoolsData])

  useEffect(() => {
    const onSelectSchoolStorage = () => {
      if (selectedSchool) {
        getFromStorageWithKey(selectedSchool.Schoolid).then(({ Payments, PendingPayments }: DataType) => {
           if (PendingPayments) setPendingPaymentsData(PendingPayments)
        })
      }
    }
    onSelectSchoolStorage()
  }, [selectedSchool])

  useEffect(() => {
    const filterPayments = () => {
      if (!selectedPrograms || selectedPrograms.length === 0) {
        setSelectedPayments([])
        setSelectedPendingPayments([])
        return
      }
      
      const programs = selectedPrograms.map(program => program.ProgramName)
      
      const isYearMatch = (rowYear) => {
          if (!selectedYear || selectedYear === "הכל") return true;
          return rowYear === selectedYear;
      };

      const filteredPayments = PaymentsData.filter(payment => 
          programs.includes(payment.ProgramName) && 
          payment.SchoolName === selectedSchool?.SchoolName &&
          isYearMatch(payment.Year) 
      )

      const filteredPendingPayments = pendingPaymentsData.filter(payment => {
          const relatedProgram = selectedPrograms.find(p => p.ProgramName === payment.ProgramName);
          return relatedProgram && 
                 relatedProgram.Schoolid === selectedSchool?.Schoolid &&
                 isYearMatch(payment.Year); 
      });

      setSelectedPayments(filteredPayments)
      setSelectedPendingPayments(filteredPendingPayments)

      setPaymentsColDef((colDef: ColDef<Payments>[]) => {
        return colDef.map(def => {
            if (def.field === "ProgramName") return { ...def, cellEditorParams: { values: selectedPrograms.map((val) => val.ProgramName) } }
            return def;
        })
      })

      setPendingPaymentsColDef((colDef: ColDef<PendingPayments>[]) => {
        return colDef.map(def => {
            if (def.field === "ProgramName") return { ...def, cellEditorParams: { values: selectedPrograms.map((val) => val.ProgramName) } }
            return def;
        })
      })
    }
    filterPayments()
  }, [selectedPrograms, PaymentsData, pendingPaymentsData, selectedSchool, selectedYear])

  const filterContactsBySchool = useCallback((schoolId: number) => {
    const filteredContacts = contactsData.filter(contact => contact.Schoolid == schoolId);
    setSelectedContacts(filteredContacts)
  }, [contactsData])

  const calculateTotalAmount = useCallback(() => {
    const total = selectedPayments.reduce((sum, row) => sum + row.Amount, 0);
    setTotalPayments(total);
  }, [selectedPayments]);

  const onDeleteRow = useCallback((params, tableName: string) => {
    const rowData = params.data;
    if (tableName === "Payments") {
      paymentsGridRef.current?.api.applyTransaction({ remove: [rowData] })
      deletePaymentRow(params.data.Id)
      setPaymentsData(prevRowData => {
        const updated = prevRowData.filter(row => row.Id !== rowData.Id);
        updateStorage({ Payments: updated, PendingPayments: pendingPaymentsData })
        return updated;
      });
    }
    if (tableName === "PendingPayments") {
      pendingPaymentsGridRef.current?.api.applyTransaction({ remove: [rowData] })
      deletePendingPaymentRow(params.data.Id)
      setPendingPaymentsData(prevRowData => {
        const updated = prevRowData.filter(row => row.Id !== rowData.Id);
        updateStorage({ PendingPayments: pendingPaymentsData })
        return updated;
      });
    }
  }, [pendingPaymentsData])

  const handleMoveRow = useCallback(() => {
    if (pendingPaymentsData.length === 0) return
    const selectedNodes = pendingPaymentsGridRef.current.api.getSelectedNodes();
    if (!selectedNodes) return
    const selectedRow = selectedNodes[0].data;
    const newRow: Payments = {
      Objectid: undefined, Id: PaymentsRowCount.current + 1, Programid: selectedRow.Programid,
      Issuer: selectedRow.Issuer, SchoolName: selectedSchool.SchoolName, ProgramName: selectedRow.ProgramName, 
      Amount: selectedRow.Amount, Year: selectedRow.Year 
    }
    addPaymentsRow(newRow)
    setPaymentsData((prevRowData) => {
      const updated = [...prevRowData, newRow];
      updateStorage({ Payments: updated })
      return updated; 
    });
    const updatedRowData = pendingPaymentsData.filter((row) => row.Id != selectedRow.Id);
    deletePendingPaymentRow(selectedRow.Id);
    setPendingPaymentsData(updatedRowData)
    updateStorage({ PendingPayments: updatedRowData })
  }, [pendingPaymentsData, selectedSchool])

  const isInChosenRoles = useCallback((role: string) => {
    if (!role) return false;
    const rolesNames = Object.values(rolesDict)
    let isFound = false
    rolesNames.forEach((roleName) => { if (role.includes(roleName)) isFound = true; })
    return isFound
  }, [rolesDict])

  const handleDialogClose = () => {
    setDialogOpen(false); setDialogType(""); setDialogMessage("");
  };

  // --- GRID DEFINITIONS ---

  const onSchoolsGridReady = useCallback(async () => {
    const schoolsModel = await getModelFields("School")
    var schoolsColDef: any = schoolsModel[0]
      ?.filter((value: any) => value === "SchoolName" || value === "EducationStage" || value === "City" || value === "SymbolNumber")
      .map((value: any, index: any) => {
        const idx = schoolsModel[0].indexOf(value);
        if (value === "SchoolName") {
          return { field: value, headerName: schoolsModel[1][idx], editable: false, width: 50, cellEditor: "agTextCellEditor", filter: false, checkboxSelection: true };
        }
        return { field: value, headerName: schoolsModel[1][idx], editable: false, width: 50, cellEditor: "agTextCellEditor", filter: true };
      });
    setSchoolsColDefs(schoolsColDef)
  }, [])

  const onProgramsGridReady = useCallback(async () => {
    const programsModel = await getModelFields("Program")
    var programsColDef: any = programsModel[0]
      ?.filter((value: any) => value === "Status" || value === "ProgramName" || value === "Days" || value === "Year" || value === "Proposal")
      .map((value: any, index: any) => {
        const idx = programsModel[0].indexOf(value);
        if (value === "ProgramName") {
          return { field: value, headerName: "תוכנית", editable: false, cellEditor: "agTextCellEditor", filter: true, minWidth: 150 };
        }
        if (value === "Proposal") {
          return {
            field: value, headerName: "הצעה", editable: false, cellEditor: "agTextCellEditor", width: 50, 
            cellRenderer: (params: ICellRendererParams<Program>) => (<a href={params.getValue()} target="_blank" className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline ltr">הצעה</a>),
            filter: true
          };
        }
        return { field: value, headerName: programsModel[1][idx], editable: false, width: 50, cellEditor: "agTextCellEditor", filter: true };
      });
    setProgramsColDefs(programsColDef)
  }, [])

  const valueFormatterDate = useCallback((params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }, [])

  const onContactsGridReady = useCallback(async () => {
    const contactsModel = await getModelFields("SchoolsContact")
    var contactsColDef: any = contactsModel[0]
      ?.filter((value: any) => value === "FirstName" || value === "LastName" || value === "Role" || value === "Cellphone")
      .map((value: any, index: any) => {
        const idx = contactsModel[0].indexOf(value);
        
        if (value === "FirstName") {
            return {
              field: value,
              headerName: contactsModel[1][idx],
              editable: false,
              width: 90,
              filter: true,
              cellRenderer: (params) => {
                 const name = params.value;
                 const phone = params.data.Cellphone;
                 if (!phone) return <span>{name}</span>;
                 let cleanPhone = phone.replace(/\D/g, ''); 
                 if (cleanPhone.startsWith('0')) { cleanPhone = '972' + cleanPhone.substring(1); }
                 return (
                     <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium"
                       title={`שלח הודעה ל-${name}`} onClick={(e) => e.stopPropagation()}>{name}</a>
                 )
              }
            };
        }

        if (value === "Role") {
          return {
            field: value, headerName: contactsModel[1][idx], editable: false, width: 50, cellEditor: "agTextCellEditor", filter: true,
            cellStyle: (params) => { if (isInChosenRoles(params.value)) { return { color: 'red' }; } return null; },
          };
        }
        if (value === 'CellPhone') return { field: value, headerName: contactsModel[1][idx], editable: false };
        return { field: value, headerName: contactsModel[1][idx], width: 50, editable: false, cellEditor: "agTextCellEditor", filter: true };
      });
    setContactsColDefs(contactsColDef)
  }, [isInChosenRoles])

  const onPricingGridReady = useCallback(async () => {
    const pricingModel = await getModelFields("ProgramPricing")
    const fieldsNames = ["Year", "PaidLessonNumbers", "PricingPerPaidLesson", "FreeLessonNumbers", "TotalLessonNumbers", "AdditionalPayments", "FinalPrice", "ProgramName"]
    var pricingColDef: any = fieldsNames.map((value: any, index: any) => {
      const idx = fieldsNames.indexOf(value);
      const columnDef: any = {
        field: value, headerName: pricingModel[1][idx], editable: false, width: 80, cellEditor: "agTextCellEditor", filter: true,
        cellEditorParams: { popupParent: document.body },
      };
      const shouldWrap = ['PricingPerPaidLesson', 'TotalLessonNumbers', 'FinalPrice'].includes(value);
      if (shouldWrap) { columnDef.wrapHeaderText = true; columnDef.autoHeaderHeight = true; columnDef.width = 75; }
      if (value === 'FinalPrice') { columnDef.valueGetter = (params: any) => FinalValueGetter(params); columnDef.headerName = "סהכ מחיר" }
      if (value === 'TotalLessonNumbers') { columnDef.valueGetter = (params: any) => TotalValueGetter(params); columnDef.headerName = "שיעורים כולל" }
      if (value === "FreeLessonNumbers") { columnDef.headerName = "בחינם" }
      if (value === "PaidLessonNumbers") { columnDef.headerName = "בתשלום" }
      if (value === "PricingPerPaidLesson") { columnDef.headerName = "עלות שיעור"; }
      if (value === "AdditionalPayments") { columnDef.headerName = "תוספות" }
      return columnDef;
    });
    setPricingColDefs(pricingColDef)
  }, [FinalValueGetter, TotalValueGetter])

  const onPaymentsGridReady = useCallback(async () => {
    const paymentsModel = await getModelFields("Payments")
    var paymentsColDef: any = paymentsModel[0]
      ?.filter((value: any) => value === "Issuer" || value === "SchoolName" || value === "ProgramName" || value === "Amount")
      .map((value: any, index: any) => {
        const idx = paymentsModel[0].indexOf(value);
        if (value === "ProgramName") {
          return { field: "ProgramName", headerName: "תוכנית", editable: true, cellEditor: "agSelectCellEditor", cellEditorParams: { values: selectedPrograms.map((val) => val.ProgramName) } };
        }
        if (value === "Issuer") return { field: value, headerName: paymentsModel[1][idx], editable: true, cellEditor: "agTextCellEditor", filter: true };
        return { field: value, headerName: paymentsModel[1][idx], editable: true, cellEditor: "agTextCellEditor", filter: true };
      });
    paymentsColDef.push({
      headerName: "", field: "actions", suppressMovable: true,
      cellRenderer: (params) => { return ( <button onClick={() => onDeleteRow(params, "Payments")}> 🗑️ </button> ); },
    });
    setPaymentsColDef(paymentsColDef)
  }, [onDeleteRow, selectedPrograms])

  const onPendingPaymentsGridReady = useCallback(async () => {
    const pendingPaymentsModel = await getModelFields("PendingPayments")
    var pendingPaymentsColDef: any = pendingPaymentsModel[0]
      ?.filter((value: any) => value === "Issuer" || value === "Date" || value === "ProgramName" || value === "CheckDate" || value === "Amount")
      .map((value: any, index: any) => {
        if (value === "ProgramName") {
          return { field: value, headerName: "תוכנית", editable: true, width: 50, cellEditor: "agSelectCellEditor", cellEditorParams: { values: ProgramsData.map((val) => val.ProgramName) } };
        }
        if (value === "Date") return { field: "Date", headerName: "תאריך", editable: true, width: 50, cellDataType: 'date', cellEditor: CustomDateCellEditor, valueFormatter: valueFormatterDate }
        if (value === "CheckDate") return { field: "CheckDate", headerName: "תאריך תשלום", width: 50, editable: true, cellDataType: 'date', cellEditor: CustomDateCellEditor, valueFormatter: valueFormatterDate }
        if (value === "Issuer") {
          return { field: value, headerName: "מנפיק", editable: true, width: 50, cellEditor: "agTextCellEditor", filter: true, checkboxSelection: true, cellRenderer: (props: ICellRendererParams<PendingPayments>) => { return ( <div> {props.getValue()} </div> ) } };
        }
        return { field: value, headerName: "סכום", width: 50, editable: true, cellEditor: "agTextCellEditor", filter: true };
      });
    pendingPaymentsColDef.push({
      headerName: "", field: "actions", suppressMovable: true,
      cellRenderer: (params) => { return ( <button onClick={() => onDeleteRow(params, "PendingPayments")}> 🗑️ </button> ); },
    });
    setPendingPaymentsColDef(pendingPaymentsColDef)
  }, [ProgramsData, onDeleteRow, valueFormatterDate])


  // --- UPDATES ---
  const onPaymentCellValueChanged = useCallback((event: CellValueChangedEvent<any>) => {
      calculateTotalAmount()
      if (event.oldValue === event.newValue) return;
      const colName = event.column.getColId()
      const newCellValue = event.newValue
      const id = event.data.Id
      const rowData = event.data;
      if (colName === "ProgramName") {
        const program = selectedPrograms.filter((program) => program.ProgramName === newCellValue)
        if (program.length > 0) {
            const programId = program[0].Programid;
            updatePaymentColumn("Programid", programId, id);
            rowData.Programid = programId; 
        }
      }
      updatePaymentColumn(colName, newCellValue, id);
      setPaymentsData((prevData) => {
        const newData = prevData.map((row) => row.Id === id ? { ...row, [colName]: newCellValue, Programid: rowData.Programid } : row);
        updateStorage({ Payments: newData });
        return newData;
      });
    }, [calculateTotalAmount, selectedPrograms]);

  const onPendingPaymentCellValueChanged = useCallback((event: CellValueChangedEvent<any>) => {
      if (event.oldValue === event.newValue) return;
      const colName = event.column.getColId()
      const newCellValue = event.newValue
      const id = event.data.Id
      const rowData = event.data;
      if (colName === "ProgramName") {
        const program = selectedPrograms.filter((program) => program.ProgramName === newCellValue)
        if (program.length > 0) {
            const programId = program[0].Programid;
            updatePendingPaymentColumn("Programid", programId, id);
            rowData.Programid = programId; 
        }
      }
      updatePendingPaymentColumn(colName, newCellValue, id);
      setPendingPaymentsData((prevData) => {
         const newData = prevData.map((row) => row.Id === id ? { ...row, [colName]: newCellValue, Programid: rowData.Programid } : row);
         updateStorage({ PendingPayments: newData });
         return newData;
      });
    }, [selectedPrograms]);

  const onPaymentsAddRowToolBarClick = useCallback(() => {
    const rowCount = PaymentsData.length
    if (!selectedSchool) { setDialogMessage("!אנא בחר בית ספר"); setDialogType("error"); setDialogOpen(true); return; }
    const paymentsRow: any = { 
        Objectid: undefined, Id: rowCount + 1, SchoolName: selectedSchool.SchoolName, 
        Amount: 0, ProgramName: selectedPrograms[0].ProgramName,
        Year: selectedYear 
    }
    addPaymentsRow(paymentsRow);
    setPaymentsData((prevData) => { const updated = [...prevData, paymentsRow]; updateStorage({ Payments: updated }); return updated; });
  }, [PaymentsData, selectedSchool, selectedPrograms, selectedYear]);

  const onPendingPaymentsAddRowToolBarClick = useCallback(() => {
    if (!selectedSchool) { setDialogMessage("נא בחר בית ספר!"); setDialogType("error"); setDialogOpen(true); return; }
    const rowCount = pendingPaymentsData.length
    const pendingPaymentsRow: PendingPayments = { 
        Objectid: undefined, Programid: selectedPrograms[0].Programid, Id: rowCount + 1, 
        Amount: 0, ProgramName: selectedPrograms[0].ProgramName, Issuer: "", Date: undefined, CheckDate: undefined,
        Year: selectedYear 
    }
    addPendingPaymentsRow(pendingPaymentsRow);
    setPendingPaymentsData((prevData) => { const updated = [...prevData, pendingPaymentsRow]; updateStorage({ PendingPayments: updated }); return updated; });
  }, [pendingPaymentsData.length, selectedPrograms, selectedSchool, selectedYear]);

  const onSchoolSelectionChanged = useCallback(async (event: any) => {
    const selectedNodes = event.api.getSelectedNodes();
    if (selectedNodes.length > 0) {
      const school = selectedNodes[0].data;
      if (!school.Remarks) setTextValue(""); else setTextValue(school.Remarks);
      setSelectedSchool(school);
      filterContactsBySchool(school.Schoolid);
    } else {
      setSelectedSchool(selectedNodes[0]); setSelectedContacts([]); setTextValue(""); setSelectedPrograms([]); setSelectedPayments([]); setSelectedPendingPayments([]);
    }
  }, [filterContactsBySchool])

  const handleYearChange = useCallback(async (selectedOption) => { setSelectedYear(selectedOption.value); setSelectedYearOption(selectedOption); }, [])

  const updateSchoolRow = useCallback(async (event) => {
    if (!selectedSchool) return; 
    const newCellValue = event.target.value
    const id = selectedSchool?.Schoolid
    updateSchoolColumn("Remarks", newCellValue, id)
    const updatedSchoolsData = schoolsData.map((school) => school.Schoolid === id ? { ...school, Remarks: newCellValue } : school);
    setSchoolsData(updatedSchoolsData)
    updateStorage({ Schools: updatedSchoolsData })
  }, [schoolsData, selectedSchool])

  const getRowId = useCallback((params: GetRowIdParams<School>) => String(params.data.Schoolid), []);

  return (
    <Container fluid={true} className={theme === "dark-theme" ? "bg-[#1f2936]" : "bg-[white]"}>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        {dialogType === "error" && (<><DialogContent> <DialogContentText>{dialogMessage}</DialogContentText> </DialogContent><DialogActions> <Button onClick={handleDialogClose}>Close</Button> </DialogActions></>)}
      </Dialog>

      <Row lg={{ cols: 12 }} >
        <Col lg={{ span: 3, offset: 0, order: 3 }} >
          <Row>
            <Col lg={{ order: 'last' }} className="text-right" ><h3 className={theme === "dark-theme" ? "text-white" : "text-black"}> שנה </h3></Col>
            <Col className="text-right"><Select options={yearOptions} value={selectedYearOption} placeholder="..בחר שנה" onChange={handleYearChange} className="text-end" menuPortalTarget={typeof document !== 'undefined' ? document.body : null} /></Col>
          </Row>
          
          <Row className="text-right" >
            {/* School Header & Filter */}
            <div className="flex flex-row-reverse items-center justify-between mb-2">
               <h3 className={`mb-0 ${theme === "dark-theme" ? "text-white" : "text-black"}`}>בתי ספר</h3>
               <input
                 type="text"
                 placeholder="חפש בית ספר..."
                 value={schoolFilterText}
                 onChange={(e) => setSchoolFilterText(e.target.value)}
                 className={`form-control form-control-sm w-[150px] text-end ${theme === "dark-theme" ? "bg-[#2b3945] text-white border-gray-600 placeholder-gray-400" : ""}`}
               />
            </div>

            <Suspense>
              <div id="grid-5" className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size "}>
                <AgGridReact
                  noRowsOverlayComponent={CustomNoRowsOverlay} 
                  ref={schoolsGridRef} 
                  rowHeight={25} 
                  rowData={selectedSchools} 
                  columnDefs={schoolsColDefs} 
                  defaultColDef={defaultColDef} 
                  enableRtl={true}
                  quickFilterText={schoolFilterText}
                  onGridReady={onSchoolsGridReady}
                  onColumnResized={onColumnEvent} onColumnMoved={onColumnEvent} onDragStopped={onColumnEvent}
                  onFirstDataRendered={(p) => onFirstDataRendered(p, 'state_schools')}
                  onSelectionChanged={onSchoolSelectionChanged} rowSelection='single' getRowId={getRowId} domLayout='autoHeight'
                />
              </div>
            </Suspense>

            {/* --- NEW SUMMARY TABLE (Centered Headers) --- */}
            <div className={`mt-3 p-2 rounded shadow-sm ${theme === "dark-theme" ? "bg-[#1f2936] border border-gray-700 text-white" : "bg-white border border-gray-200 text-black"}`} dir="rtl">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-gray-500/30 text-sm opacity-80">
                    <th className="pb-2 font-bold w-1/4 text-center">מריאנה</th> {/* Added text-center */}
                    <th className="pb-2 font-bold w-1/4 border-r border-gray-500/20 pr-2 text-center">עמרי</th> {/* Added text-center */}
                    <th className="pb-2 font-bold w-1/2 border-r border-gray-500/20 pr-2 text-center"> {/* Added text-center */}
                      סיכום שנתי{' '}
                      <span style={{ color: '#007bff' }}>
                        {selectedYear && selectedYear !== "הכל" ? selectedYear : ""}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* Row 1: Expected */}
                  <tr>
                    <td className="py-1 text-gray-500">-</td>
                    <td className="py-1 border-r border-gray-500/20 pr-2 text-gray-500">-</td>
                    <td className="py-1 border-r border-gray-500/20 pr-2 flex justify-between">
                       <span>צפי הכנסות:</span>
                       <span className="font-bold">{schoolsTotal.annual.expected.toLocaleString()} ₪</span>
                    </td>
                  </tr>
                  
                  {/* Row 2: Paid */}
                  <tr>
                    <td className="py-1 text-green-500 font-bold">{schoolsTotal.mariana.paid.toLocaleString()} ₪</td>
                    <td className="py-1 border-r border-gray-500/20 pr-2 text-green-500 font-bold">{schoolsTotal.omri.paid.toLocaleString()} ₪</td>
                    <td className="py-1 border-r border-gray-500/20 pr-2 text-green-500 flex justify-between">
                       <span>שולם בפועל:</span>
                       <span className="font-bold">{schoolsTotal.annual.paid.toLocaleString()} ₪</span>
                    </td>
                  </tr>

                  {/* Row 3: Pending */}
                  <tr>
                    <td className="py-1 text-yellow-600 dark:text-yellow-400 font-bold">{schoolsTotal.mariana.pending.toLocaleString()} ₪</td>
                    <td className="py-1 border-r border-gray-500/20 pr-2 text-yellow-600 dark:text-yellow-400 font-bold">{schoolsTotal.omri.pending.toLocaleString()} ₪</td>
                    <td className="py-1 border-r border-gray-500/20 pr-2 text-yellow-600 dark:text-yellow-400 flex justify-between">
                       <span>תשלומים בדרך:</span>
                       <span className="font-bold">{schoolsTotal.annual.pending.toLocaleString()} ₪</span>
                    </td>
                  </tr>

                  {/* Row 4: Remaining */}
                  <tr className="border-t border-gray-500/30">
                     <td className="py-1 pt-2 text-gray-500">-</td>
                     <td className="py-1 pt-2 border-r border-gray-500/20 pr-2 text-gray-500">-</td>
                     <td className={`py-1 pt-2 border-r border-gray-500/20 pr-2 flex justify-between font-bold ${schoolsTotal.annual.remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                       <span>יתרה לגבייה:</span>
                       <span>{schoolsTotal.annual.remaining.toLocaleString()} ₪</span>
                     </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* ------------------------------------- */}

          </Row>
        </Col>

        <Col lg={{ span: 4, offset: 0, order: 2 }}>
          <Row>
            <Col><Row>
                <div className="text-right"> <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>אנשי קשר</h5> </div>
                <Suspense>
                  <div id="grid-4" className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size"}>
                    <AgGridReact
                      noRowsOverlayComponent={CustomNoRowsOverlay} ref={contactsGridRef} rowHeight={25} rowData={selectedContacts} columnDefs={contactsColDefs} defaultColDef={defaultColDef} enableRtl={true}
                      onGridReady={onContactsGridReady}
                      onColumnResized={onColumnEvent} onColumnMoved={onColumnEvent} onDragStopped={onColumnEvent}
                      onFirstDataRendered={(p) => onFirstDataRendered(p, 'state_contacts')}
                      domLayout='autoHeight'
                    />
                  </div>
                </Suspense>
              </Row></Col>
          </Row>
          <Row>
            <Col>
              <div className="flex items-center justify-between mb-2">
                  <button className="hover:bg-[#253d37] rounded opacity-0"> <FcAddRow className="w-[37px] h-[37px] opacity-0" /> </button>
                  <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}> תוכניות </h5>
              </div>
              <Suspense>
                <div id="grid-1" className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size"}>
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay} ref={programsGridRef} rowHeight={25} rowData={selectedPrograms} columnDefs={programsColDefs} defaultColDef={defaultColDef} enableRtl={true}
                    onGridReady={onProgramsGridReady}
                    onColumnResized={onColumnEvent} onColumnMoved={onColumnEvent} onDragStopped={onColumnEvent}
                    onFirstDataRendered={(p) => onFirstDataRendered(p, 'state_programs')}
                    domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="flex flex-row-reverse items-center justify-start gap-2">
                <OverlayTrigger placement={"top"} overlay={<Tooltip className="absolute" id="tooltip-bottom">הוסף שורה</Tooltip>}>
                  <button className="hover:bg-[#253d37] rounded relative" onClick={onPendingPaymentsAddRowToolBarClick}> <FcAddRow className="w-[37px] h-[37px]" /> </button>
                </OverlayTrigger>
                <h5 className={`${theme === "dark-theme" ? "text-white" : "text-black"} mb-0`}>תשלומים בדרך</h5>
                 <Button size="sm" className="move-row-btn px-2 py-0 text-sm whitespace-nowrap h-[28px] flex items-center ms-2" onClick={handleMoveRow}> סמן כשולם </Button>
              </div>
              <Suspense>
                <div id="grid-3" className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size overflow-visible " : "ag-theme-quartz custom-text-size overflow-visible "}>
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay} ref={pendingPaymentsGridRef} rowHeight={25} rowData={selectedPendingPayments} columnDefs={pendingPaymentsColDef} defaultColDef={defaultColDef} enableRtl={true}
                    onGridReady={onPendingPaymentsGridReady}
                    onColumnResized={onColumnEvent} onColumnMoved={onColumnEvent} onDragStopped={onColumnEvent}
                    onFirstDataRendered={(p) => onFirstDataRendered(p, 'state_pending')}
                    singleClickEdit={true} onCellValueChanged={onPendingPaymentCellValueChanged} domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>
        </Col>

        <Col lg={{ span: 5, offset: 0, order: 1 }} className="overflow-visible">
          <Row>
            <Col>
              <div className="text-right"> <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>תמחור</h5> </div>
              <Suspense>
                <div id="grid-1" className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size"}>
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay} ref={pricingGridRef} rowHeight={25} rowData={selectedPrograms} columnDefs={pricingColDefs} defaultColDef={defaultColDef} enableRtl={true}
                    onGridReady={onPricingGridReady}
                    onColumnResized={onColumnEvent} onColumnMoved={onColumnEvent} onDragStopped={onColumnEvent}
                    onFirstDataRendered={(p) => onFirstDataRendered(p, 'state_pricing')}
                    domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="flex flex-row-reverse">
                <OverlayTrigger placement={"top"} overlay={<Tooltip className="absolute" id="tooltip-bottom">הוסף שורה</Tooltip>}>
                  <button className="hover:bg-[#253d37] rounded" onClick={onPaymentsAddRowToolBarClick}> <FcAddRow className="w-[37px] h-[37px]" /> </button>
                </OverlayTrigger>
                <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>תשלומים</h5>
              </div>
              <Suspense>
                <div id="grid-2" className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size"}>
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay} ref={paymentsGridRef} rowHeight={25} rowData={selectedPayments} columnDefs={paymentsColDef} defaultColDef={defaultColDef} enableRtl={true}
                    onGridReady={onPaymentsGridReady}
                    onColumnResized={onColumnEvent} onColumnMoved={onColumnEvent} onDragStopped={onColumnEvent}
                    onFirstDataRendered={(p) => onFirstDataRendered(p, 'state_payments')}
                    onCellValueChanged={onPaymentCellValueChanged} domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>
          
          <div className="flex flex-col mt-2">
                <div className="flex flex-row-reverse justify-between items-center mb-1">
                    <h5 className={theme === "dark-theme" ? "text-white " : "text-black"}>{`${totalPrice - totalPayments}:נותר לתשלום`}</h5>
                </div>
                
                <div className={`w-100 ${theme === "dark-theme" ? "bg-[#1f2936]" : "bg-white"}`}>
                  <h5 className="text-right">הערות</h5>
                  <Form.Control
                    as="textarea" 
                    className={theme === "dark-theme" ? "bg-[#1f2936]" : "bg-white"} 
                    rows={2} 
                    value={textValue}
                    placeholder={!selectedSchool ? "בחר בית ספר כדי להוסיף הערה" : ""}
                    disabled={!selectedSchool}
                    onChange={(e) => setTextValue(e.target.value)} 
                    onBlur={updateSchoolRow} 
                    style={{ direction: "rtl", textAlign: "right", width: "100%" }}
                  />
                </div>
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default PaymentsTable;