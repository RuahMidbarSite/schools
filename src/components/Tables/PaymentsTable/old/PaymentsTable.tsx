"use client"
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { useState, Suspense, useRef } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { getPrograms, getSchoolsPrograms, } from '@/db/programsRequests';
import { SchoolsContact, School, Program, Payments, PendingPayments } from "@prisma/client";
import { getYears, getModelFields, getPayments, } from '@/db/generalrequests';
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

import { CellValueChangedEvent, ColDef, GetRowIdParams, ICellRendererParams, SizeColumnsToContentStrategy, SizeColumnsToFitGridStrategy, SizeColumnsToFitProvidedWidthStrategy } from 'ag-grid-community';
import { OverlayTrigger, Tooltip, Row, Col, Button, Form, Container } from 'react-bootstrap';
import { FcAddRow } from 'react-icons/fc';
import { CustomDateCellEditor } from '@/components/Tables/GeneralFiles/Date/CustomDateCellEditor/CustomDateCellEditor';
import { getAllSchools, updateSchoolColumn } from '@/db/schoolrequests';

import { ThemeContext } from '@/context/Theme/Theme';
import { DataType, getFromStorage, getFromStorageWithKey, updateStorage } from '../PricingTable/Storage/PricingDataStorage';
import { getAllContacts } from '@/db/contactsRequests';
import { useYear, YearContext } from '@/context/YearContext';

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";



export const PaymentsTable = () => {

  const rolesDict = useMemo(() => ({
    budget: "תקציב",
    payments: "תשלומים",
    acounts: "חשבונות",
    funds: "כספים",
    treasurer: "גזבר",
  }), [])

  const PaymentsRowCount = useRef(0);
  const PendingPaymentsRowCount = useRef(0)

  const [schoolsData, setSchoolsData] = useState<School[]>([]);
  const [schoolsColDefs, setSchoolsColDefs] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState<School[]>()

  const [ProgramsData, setProgrmsData] = useState<Program[]>([]);
  const [programsColDefs, setProgramsColDefs] = useState([]);

  const [contactsData, setContactsData] = useState<SchoolsContact[]>([]);
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

  const [totalPrice, setTotalPrice] = useState(0)


  const [totalPayments, setTotalPayments] = useState(0)



  const gridRef: any = useRef(null);

  const paymentsGridRef: any = useRef(null);
  const pendingPaymentsGridRef: any = useRef(null);
  const schoolsGridRef: any = useRef(null);

  const [textValue, setTextValue] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");



  // Define global column properties
  const defaultColDef = useMemo(() => ({
    minWidth: 100,
    maxWidth: 200,
    sortable: true,
    filter: true,
  }), []);
  const { theme } = useContext(ThemeContext)

  const autoSizeStrategy = useMemo<
    | SizeColumnsToFitGridStrategy
    | SizeColumnsToFitProvidedWidthStrategy
    | SizeColumnsToContentStrategy
  >(() => {
    return {
      type: "fitCellContents",
    };
  }, []);


  const CustomNoRowsOverlay = useCallback(() => {
    const Name = "לא זוהו נתונים"
    return (
      <div className="ag-overlay-no-rows-center text-blue-300">
        <span> {Name} </span>
      </div>
    );
  }, [])

  useEffect(() => {

    const fetchData = async () => {

      getFromStorage().then(({ Programs, Schools, schoolsContacts, Payments, PendingPayments, Years }: DataType) => {
        if (Programs && Schools && schoolsContacts && Payments && PendingPayments && Years) {

          const formattedOptions = [{
            label: 'הכל',
            value: undefined,
          }].concat(Years.map(selectedYear => ({
            label: selectedYear.YearName,
            value: selectedYear.YearName,
          })));
          const initialSelectedOption = formattedOptions.find(option => option.value === selectedYear);
          let AllProgramsSchool = [...Programs.map((program) => program.Schoolid)]
          let AllSchoolsWithPrograms = Schools.filter((school) => AllProgramsSchool.includes(school.Schoolid))
          setProgrmsData(Programs)
          setSchoolsData(AllSchoolsWithPrograms)
          setSelectedSchools(AllSchoolsWithPrograms)
          setContactsData(schoolsContacts)
          setPaymentsData(Payments)
          setPendingPaymentsData(PendingPayments)
          setYearOptions(formattedOptions);
          setSelectedYearOption(initialSelectedOption || { label: "הכל", value: undefined });
          return
        }
        else {

          Promise.all([
            getPrograms(),
            getAllSchools(),
            getAllContacts(),
            getYears(),
            getPayments(),
            getPendingPayments()
          ]).then(([programsData, schoolsData, contacts, yearsData, paymentsData, pendingPaymentsData]) => {


            const formattedOptions = [{
              label: 'הכל',
              value: undefined,
            }].concat(yearsData.map(selectedYear => ({
              label: selectedYear.YearName,
              value: selectedYear.YearName,
            })));
            const initialSelectedOption = formattedOptions.find(option => option.value === selectedYear);
            let AllProgramsSchool = [...programsData.map((program) => program.Schoolid)]
            let AllSchoolsWithPrograms = schoolsData.filter((school) => AllProgramsSchool.includes(school.Schoolid))
            setProgrmsData(programsData)
            setSchoolsData(AllSchoolsWithPrograms)
            setSelectedSchools(AllSchoolsWithPrograms)
            setContactsData(contacts)
            setPaymentsData(paymentsData)
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
      const totalPrice = Array.isArray(selectedPrograms)
        ? selectedPrograms.reduce((sum, obj) => sum + (obj.PaidLessonNumbers * obj.PricingPerPaidLesson + obj.AdditionalPayments), 0)
        : 0;

      const totalPayments = Array.isArray(selectedPayments)
        ? selectedPayments.reduce((sum, obj) => sum + obj.Amount, 0)
        : 0;

      setTotalPrice(totalPrice);
      setTotalPayments(totalPayments);
    };
    updateSum();
  }, [selectedPrograms, selectedPayments]);


  /** On Programselected and year selected:
   1. Filter all programs
   */
  useEffect(() => {
    const filterPrograms = () => {
      let filteredPrograms = [...ProgramsData]
      if (selectedSchool) {
        filteredPrograms = ProgramsData.filter(program => program.Schoolid === selectedSchool?.Schoolid)
      }
      const YearFilter = filteredPrograms.filter((program) => {
        if (selectedYear === "הכל" || selectedYear === undefined) {
          return true
        } else {
          return program.Year === selectedYear
        }
      })
      const schools_after_filter = YearFilter.map((program) => program.Schoolid)
      const SchoolYearFilter = [...schoolsData].filter((school) => schools_after_filter.includes(school.Schoolid))
      if (selectedSchool) {
        setSelectedPrograms(YearFilter)
      }

      setSelectedSchools(SchoolYearFilter)
    }

    filterPrograms()

  }, [selectedYear, selectedSchool, ProgramsData, schoolsData])

  useEffect(() => {
    const onSelectSchoolStorage = () => {
      if (selectedSchool) {
        getFromStorageWithKey(selectedSchool.Schoolid).then(({ Payments, PendingPayments }: DataType) => {

          if (Payments) {
            setPaymentsData(Payments)
          }
          if (PendingPayments) {
            setPendingPaymentsData(PendingPayments)
          }
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
      const filteredPayments = PaymentsData.filter(payment => {
        return (programs.includes(payment.ProgramName))
      })
      const filteredPendingPayments = pendingPaymentsData.filter(payment => {
        return (programs.includes(payment.ProgramName))
      })
      setSelectedPayments(filteredPayments)
      setSelectedPendingPayments(filteredPendingPayments)

      setPaymentsColDef((colDef: ColDef<Payments>[]) => {
        let new_coldef = []
        for (let def of colDef) {
          if (def.field === "ProgramName") {
            let new_def = def
            new_def['cellEditorParams'] = { values: selectedPrograms.map((val) => val.ProgramName) }
            new_coldef.push(new_def)
          } else {
            new_coldef.push(def)
          }
        }
        return new_coldef
      })

      setPendingPaymentsColDef((colDef: ColDef<PendingPayments>[]) => {
        let new_coldef = []
        for (let def of colDef) {
          if (def.field === "ProgramName") {
            let new_def = def
            new_def['cellEditorParams'] = { values: selectedPrograms.map((val) => val.ProgramName) }
            new_coldef.push(new_def)
          } else {
            new_coldef.push(def)
          }
        }
        return new_coldef
      })

    }


    filterPayments()

  }, [selectedPrograms, PaymentsData, pendingPaymentsData])

  const filterContactsBySchool = useCallback((schoolId: number) => {

    const filteredContacts = contactsData.filter(contact => {
      return (
        contact.Schoolid == schoolId
      );
    });
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
        const updatedPayments = prevRowData.filter(row => row.Id !== rowData.Id);

        // Update cache 
        updateStorage({ Payments: updatedPayments, PendingPayments: pendingPaymentsData })


        return updatedPayments;
      });

    }

    if (tableName === "PendingPayments") {
      pendingPaymentsGridRef.current?.api.applyTransaction({ remove: [rowData] })

      deletePendingPaymentRow(params.data.Id)

      setPendingPaymentsData(prevRowData => {
        const updatedPendingPayments = prevRowData.filter(row => row.Id !== rowData.Id);

        // Update cache 
        updateStorage({ PendingPayments: pendingPaymentsData })

        return updatedPendingPayments;
      });
    }

  }, [pendingPaymentsData])

  const handleMoveRow = useCallback(() => {

    if (pendingPaymentsData.length === 0) {
      console.log("empty")
      return
    }

    const selectedNodes = pendingPaymentsGridRef.current.api.getSelectedNodes();
    if (!selectedNodes) {
      console.log("no row selected")
      return
    }

    const selectedRow = selectedNodes[0].data;

    const newRow: Payments = {
      Objectid: undefined,
      Id: PaymentsRowCount.current + 1,
      Programid: selectedRow.Programid,
      Issuer: selectedRow.Issuer,
      SchoolName: selectedSchool.SchoolName,
      ProgramName: selectedRow.ProgramName,
      Amount: selectedRow.Amount
    }

    console.log("newRow", newRow)

    addPaymentsRow(newRow)
    setPaymentsData((prevRowData) => {
      const updatedPayments = [...prevRowData, newRow];
      updateStorage({ Payments: updatedPayments })
      // Update Payments cache 

      return updatedPayments; // Update the state
    });

    const updatedRowData = pendingPaymentsData.filter((row) => row.Id != selectedRow.Id);
    deletePendingPaymentRow(selectedRow.Id);

    setPendingPaymentsData(updatedRowData)



    updateStorage({ PendingPayments: updatedRowData })

  }, [pendingPaymentsData, selectedSchool])


  const isInChosenRoles = useCallback((role: string) => {
    const rolesNames = Object.values(rolesDict)

    let isFound = false

    rolesNames.forEach((roleName) => {
      if (role.includes(roleName)) {
        isFound = true;
      }
    })

    return isFound
  }, [rolesDict])

  const handleDialogClose = () => {
    setDialogOpen(false);
    setDialogType("");
    setDialogMessage("");
  };


  const onSchoolsGridReady = useCallback(async () => {
    const schoolsModel = await getModelFields("School")

    var schoolsColDef: any = schoolsModel[0]
      ?.filter((value: any) =>
        value === "SchoolName" ||
        value === "EducationStage" ||
        value === "City" ||
        value === "SymbolNumber"
      )
      .map((value: any, index: any) => {
        const idx = schoolsModel[0].indexOf(value);
        if (value === "SchoolName") {
          return {
            field: value,
            headerName: schoolsModel[1][idx],
            editable: false,
            width: 50,
            cellEditor: "agTextCellEditor",
            filter: false,
            checkboxSelection: true,


          };
        }

        return {
          field: value,
          headerName: schoolsModel[1][idx],
          editable: false,
          width: 50,
          cellEditor: "agTextCellEditor",
          filter: true,

        };
      });

    setSchoolsColDefs(schoolsColDef)


  }, [])

  const onProgramsGridReady = useCallback(async () => {
    const programsModel = await getModelFields("Program")


    var programsColDef: any = programsModel[0]
      ?.filter((value: any) =>
        value === "Status" ||
        value === "ProgramName" ||
        value === "Days" ||
        value === "Year" ||
        value === "Proposal"
      )
      .map((value: any, index: any) => {
        const idx = programsModel[0].indexOf(value);
        if (value === "ProgramName") {
          return {
            field: value,
            headerName: "תוכנית",
            editable: false,
            cellEditor: "agTextCellEditor",
            filter: true,
            width: 50,
          };
        }
        if (value === "Proposal") {
          return {
            field: value,
            headerName: "הצעה",
            editable: false,
            cellEditor: "agTextCellEditor",
            width: 50,
            cellRenderer: (params: ICellRendererParams<Program>) => (<a
              href={params.getValue()}
              target="_blank"

              className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline ltr"
            >
              הצעה
            </a>),
            filter: true,
          };
        }
        return {
          field: value,
          headerName: programsModel[1][idx],
          editable: false,
          width: 50,
          cellEditor: "agTextCellEditor",
          filter: true,

        };
      });

    setProgramsColDefs(programsColDef)
    setSelectedPrograms([])
  }, [])
  const valueFormatterDate = useCallback((params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [])

  const onContactsGridReady = useCallback(async () => {
    const contactsModel = await getModelFields("SchoolsContact")

    // TODO:  Add Whatsapp column
    var contactsColDef: any = contactsModel[0]
      ?.filter((value: any) =>
        value === "FirstName" ||
        value === "LastName" ||
        value === "Role" ||
        value === "Cellphone"
      )
      .map((value: any, index: any) => {
        const idx = contactsModel[0].indexOf(value);
        if (value === "Role") {
          return {
            field: value,
            headerName: contactsModel[1][idx],
            editable: false,
            width: 50,
            cellEditor: "agTextCellEditor",
            filter: true,

            cellStyle: (params) => {
              if (isInChosenRoles(params.value)) { // External condition
                return { color: 'red' }; // Paint in red
              }
              return null; // Leave it as is (default style)
            },
          };
        }
        if (value === 'CellPhone') {
          return {
            field: value,
            headerName: contactsModel[1][idx],
            editable: false,
          };

        }
        return {
          field: value,
          headerName: contactsModel[1][idx],
          width: 50,
          editable: false,
          cellEditor: "agTextCellEditor",
          filter: true,

        };
      });

    setContactsColDefs(contactsColDef)
    setSelectedContacts([])
  }, [isInChosenRoles])


  const onPricingGridReady = useCallback(async () => {
    const pricingModel = await getModelFields("ProgramPricing")

    console.log("pricing model: ", pricingModel)

    const fieldsNames = ["Year", "PaidLessonNumbers", "PricingPerPaidLesson", "FreeLessonNumbers", "TotalLessonNumbers",
      "AdditionalPayments", "FinalPrice", "ProgramName"]

    var pricingColDef: any = fieldsNames.map((value: any, index: any) => {
      const idx = fieldsNames.indexOf(value);

      const columnDef: any = {
        field: value,
        headerName: pricingModel[1][idx],
        editable: false,
        width: 50,
        cellEditor: "agTextCellEditor",
        filter: true,
        cellEditorParams: {
      popupParent: document.body,
    },

      };

      if (value === 'FinalPrice') {
        columnDef.valueGetter = (params: any) => {
          return FinalValueGetter(params);
        };
        columnDef.headerName = "סהכ מחיר"
      }
      if (value === 'TotalLessonNumbers') {
        columnDef.valueGetter = (params: any) => {
          return TotalValueGetter(params);
        };
        columnDef.headerName = "שיעורים כולל"
      }
      if (value === "FreeLessonNumbers") {
        columnDef.headerName = "בחינם"
      }
      if (value === "PaidLessonNumbers") {
        columnDef.headerName = "בתשלום"
      }
      if (value === "AdditionalPayments") {
        columnDef.headerName = "תוספות"
      }


      return columnDef;
    });

    setPricingColDefs(pricingColDef)
  }, [FinalValueGetter, TotalValueGetter])

  const onPaymentsGridReady = useCallback(async () => {
    const paymentsModel = await getModelFields("Payments")

    var paymentsColDef: any = paymentsModel[0]
      ?.filter((value: any) =>
        value === "Issuer" ||
        value === "SchoolName" ||
        value === "ProgramName" ||
        value === "Amount"
      )
      .map((value: any, index: any) => {
        const idx = paymentsModel[0].indexOf(value);
        if (value === "ProgramName") {
          return {

            field: "ProgramName",
            headerName: "תוכנית",
            editable: true,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: {
              values: selectedPrograms.map((val) => val.ProgramName)
            },
          };

        }
        if (value === "Issuer") {
          return {
            field: value,
            headerName: paymentsModel[1][idx],
            editable: true,
            cellEditor: "agTextCellEditor",
            filter: true,
          };
        }

        return {
          field: value,
          headerName: paymentsModel[1][idx],
          editable: true,
          cellEditor: "agTextCellEditor",
          filter: true,
        };
      });

    paymentsColDef.push({
      headerName: "",
      field: "actions",
      cellRenderer: (params) => {
        return (
          <button onClick={() => onDeleteRow(params, "Payments")}>
            🗑️
          </button>
        );
      },
      suppressMovable: true,
    });


    setPaymentsColDef(paymentsColDef)
    setSelectedPayments([])
  }, [onDeleteRow, selectedPrograms])

  const onPendingPaymentsGridReady = useCallback(async () => {
    const pendingPaymentsModel = await getModelFields("PendingPayments")
    console.log("pendingPaymentsModel: ", pendingPaymentsModel)


    // TODO - fix column mapping
    var pendingPaymentsColDef: any = pendingPaymentsModel[0]
      ?.filter((value: any) =>
        value === "Issuer" ||
        value === "Date" ||
        value === "ProgramName" ||
        value === "CheckDate" ||
        value === "Amount"

      )
      .map((value: any, index: any) => {
        const idx = pendingPaymentsModel[0].indexOf(value);
        if (value === "ProgramName") {
          return {
            field: value,
            headerName: "תוכנית",
            editable: true,
            width: 50,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: {
              values: ProgramsData.map((val) => val.ProgramName)
            },

          };
        }

        if (value === "Date") {
          return {
            field: "Date",
            headerName: "תאריך",
            editable: true,
            width: 50,
            cellDataType: 'date',
            cellEditor: CustomDateCellEditor,
            valueFormatter: valueFormatterDate
          }
        }
        if (value === "CheckDate") {
          return {
            field: "CheckDate",
            headerName: "תאריך תשלום",
            width: 50,
            editable: true,
            cellDataType: 'date',
            cellEditor: CustomDateCellEditor,
            valueFormatter: valueFormatterDate
          }
        }


        if (value === "Issuer") {
          return {
            field: value,
            headerName: "מנפיק",
            editable: true,
            width: 50,
            cellEditor: "agTextCellEditor",
            filter: true,
            checkboxSelection: true,
            cellRenderer: (props: ICellRendererParams<PendingPayments>) => {

              return (
                <div> {props.getValue()} </div>
              )

            }

          };
        }

        return {
          field: value,
          headerName: "סכום",
          width: 50,
          editable: true,
          cellEditor: "agTextCellEditor",
          filter: true,
        };
      });

    pendingPaymentsColDef.push({
      headerName: "",
      field: "actions",
      cellRenderer: (params) => {
        return (
          <button onClick={() => onDeleteRow(params, "PendingPayments")}>
            🗑️
          </button>
        );
      },
      suppressMovable: true,
    });

    setPendingPaymentsColDef(pendingPaymentsColDef)
    setSelectedPendingPayments([])

  }, [ProgramsData, onDeleteRow, valueFormatterDate])


  const onPaymentCellValueChanged = useCallback(
    (event: CellValueChangedEvent<any>) => {
      calculateTotalAmount()
      if (event.oldValue === event.newValue) {
        return;
      }

      const colName = event.column.getColId()
      const newCellValue = event.newValue
      const id = event.data.Id

      if (colName === "ProgramName") {
        const program = selectedPrograms.filter(
          (program) => program.ProgramName === newCellValue)
        const programId = program.map((p) => p.Programid)[0]
        updatePaymentColumn(
          "Programid",
          programId,
          id,
        );
      }
      updatePaymentColumn(
        colName,
        newCellValue,
        id,
      );

      const future_data: Payments[] = [];
      paymentsGridRef.current.api.forEachNode((node: any) => {
        if (node.data) {
          future_data.push(node.data);
        }
      });

      setPaymentsData(future_data);
      updateStorage({ Payments: future_data })


    },
    [calculateTotalAmount, selectedPrograms]
  );

  const onPendingPaymentCellValueChanged = useCallback(
    (event: CellValueChangedEvent<any>) => {
      if (event.oldValue === event.newValue) {
        return;
      }


      const colName = event.column.getColId()
      const newCellValue = event.newValue
      const id = event.data.Id

      if (colName === "ProgramName") {
        console.log("selectedPrograms: ", selectedPrograms)
        const program = selectedPrograms.filter(
          (program) => program.ProgramName === newCellValue)
        const programId = program.map((p) => p.Programid)[0]
        updatePendingPaymentColumn(
          "Programid",
          programId,
          id,
        );
      }
      updatePendingPaymentColumn(
        colName,
        newCellValue,
        id,
      );

      const future_data: PendingPayments[] = [];
      pendingPaymentsGridRef.current.api.forEachNode((node: any) => {
        if (node.data) {
          future_data.push(node.data);
        }
      });

      setPendingPaymentsData(future_data);
      updateStorage({ PendingPayments: future_data })

    },
    [selectedPrograms]
  );

  const onPaymentsAddRowToolBarClick = useCallback(() => {
    const rowCount = PaymentsData.length
    if (!selectedSchool) {
      console.log("please select school");
      setDialogMessage("!אנא בחר בית ספר")
      setDialogType("error");
      setDialogOpen(true);
      return
    }


    const paymentsRow: any =
    {
      Objectid: undefined,
      Id: rowCount + 1,
      SchoolName: selectedSchool.SchoolName,
      Amount: 0,
      ProgramName: selectedPrograms[0].ProgramName

    }

    addPaymentsRow(paymentsRow).then((res) => {


    })
    setPaymentsData((prevData) => {
      const updatedPaymentsData = [...prevData, paymentsRow];

      // Update the cache 
      updateStorage({ Payments: updatedPaymentsData })
      return updatedPaymentsData;
    });

  }, [PaymentsData, selectedSchool, selectedPrograms]);




  const onPendingPaymentsAddRowToolBarClick = useCallback(() => {
    if (!selectedSchool) {
      console.log("please select school");
      setDialogMessage("נא בחר בית ספר!")
      setDialogType("error");
      setDialogOpen(true);
      return
    }

    const rowCount = pendingPaymentsData.length
    const pendingPaymentsRow: PendingPayments =
    {
      Objectid: undefined,
      Programid: selectedPrograms[0].Programid,
      Id: rowCount + 1,
      Amount: 0,
      ProgramName: selectedPrograms[0].ProgramName,
      Issuer: "",
      Date: undefined,
      CheckDate: undefined


    }

    console.log("pendingPaymentsRow: ", pendingPaymentsRow)


    addPendingPaymentsRow(pendingPaymentsRow);
    setPendingPaymentsData((prevData) => {
      const updatedPendingPaymentsData = [...prevData, pendingPaymentsRow];

      updateStorage({ PendingPayments: [...prevData, pendingPaymentsRow] })
      return updatedPendingPaymentsData;
    });


  }, [pendingPaymentsData.length, selectedPrograms, selectedSchool]);


  const onSchoolSelectionChanged = useCallback(async (event: any) => {
    const selectedNodes = event.api.getSelectedNodes();
    if (selectedNodes.length > 0) {

      // Process the newly selected row
      const school = selectedNodes[0].data;
      const schoolId = school.Schoolid;
      const schoolRemarks = school.Remarks;
      if (!schoolRemarks) {
        setTextValue("");
      }
      else {
        setTextValue(school.Remarks);
      }

      setSelectedSchool(school);

      filterContactsBySchool(schoolId);

    } else {
      setSelectedSchool(selectedNodes[0]);
      setSelectedContacts([]);
      setTextValue("");
      setSelectedPrograms([]);
      setSelectedPayments([]);
      setSelectedPendingPayments([]);
    }
  }, [filterContactsBySchool])




  const handleYearChange = useCallback(async (selectedOption) => {
    const year = selectedOption.value
    setSelectedYear(year)
    setSelectedYearOption(selectedOption);
  }, [])


  const updateSchoolRow = useCallback(async (event) => {
    const newCellValue = event.target.value
    const colName = "Remarks"
    const id = selectedSchool?.Schoolid
    updateSchoolColumn(
      colName,
      newCellValue,
      id
    )
    const school: School = schoolsData.find((res) => res.Schoolid === id)
    const updated_school: School = { ...school, Remarks: newCellValue }

    const updatedSchoolsData = schoolsData.map((school) =>
      school.Schoolid === id ? { ...school, Remarks: newCellValue } : school
    );
    setSchoolsData(updatedSchoolsData)
    updateStorage({ Schools: updatedSchoolsData })



    return
  }, [schoolsData, selectedSchool])

  const getRowId = useCallback(
    (params: GetRowIdParams<School>) => String(params.data.Schoolid),
    [],
  );
  return (

    <Container fluid={true} className={theme === "dark-theme" ? "bg-[#1f2936]" : "bg-[white]"}>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        {dialogType === "error" && (
          <>

            <DialogContent>
              <DialogContentText>{dialogMessage}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDialogClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>


      <Row lg={{ cols: 12 }} >
        <Col lg={{ span: 3, offset: 1, order: 3 }} >
          <Row>
            <Col lg={{ order: 'last' }} className="text-right" >
              <h3 className={theme === "dark-theme" ? "text-white" : "text-black"}>
                שנה
              </h3>
            </Col>
            <Col className="text-right">
              <Select
                options={yearOptions}
                value={selectedYearOption}
                placeholder="..בחר שנה"
                onChange={handleYearChange}
                className="text-end"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </Col>
          </Row>


          <Row className="text-right" >

            <h3 className={theme === "dark-theme" ? "text-white" : "text-black"}>בתי ספר</h3>

            <Suspense>
              <div
                id="grid-5"
                className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size "}
              >
                <AgGridReact
                  noRowsOverlayComponent={CustomNoRowsOverlay}
                  ref={schoolsGridRef}
                  rowHeight={25}
                  rowData={selectedSchools}
                  columnDefs={schoolsColDefs}
                  defaultColDef={defaultColDef}
                  enableRtl={true}

                  onGridReady={onSchoolsGridReady}
                  autoSizeStrategy={autoSizeStrategy}
                  onSelectionChanged={onSchoolSelectionChanged}
                  rowSelection='single'
                  getRowId={getRowId}
                  domLayout='autoHeight'
                />
              </div>
            </Suspense>
          </Row>
        </Col>
        <Col lg={{ span: 3, offset: 0, order: 2 }}>
          <Row>
            <Col  >
              <Row>
                <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>אנשי קשר</h5>

                <Suspense>
                  <div
                    id="grid-4"
                    className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size " : "ag-theme-quartz custom-text-size"}
                  >
                    <AgGridReact
                      noRowsOverlayComponent={CustomNoRowsOverlay}
                      ref={gridRef}
                      rowHeight={25}
                      rowData={selectedContacts}
                      columnDefs={contactsColDefs}
                      defaultColDef={defaultColDef}
                      enableRtl={true}
                      autoSizeStrategy={autoSizeStrategy}
                      onGridReady={onContactsGridReady}
                      domLayout='autoHeight'

                    />
                  </div>
                </Suspense>
              </Row>
            </Col>
          </Row>
          <Row>
            <Col   >
              <div className="flex flex-row-reverse">
                <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>
                  תוכניות
                </h5>
                <button
                  className="hover:bg-[#253d37] rounded opacity-0"
                >
                  <FcAddRow className="w-[37px] h-[37px] opacity-0" />
                </button>
              </div>
              <Suspense>

                <div
                  id="grid-1"
                  className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size  " : "ag-theme-quartz custom-text-size "}

                >
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay}
                    ref={gridRef}
                    rowHeight={25}
                    rowData={selectedPrograms}
                    columnDefs={programsColDefs}
                    defaultColDef={defaultColDef}
                    enableRtl={true}
                    autoSizeStrategy={autoSizeStrategy}
                    onGridReady={onProgramsGridReady}
                    domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>

        </Col>

        <Col lg={{ span: 5, offset: 0, order: 1 }} className="overflow-visible">
          <Row>
            <Col  >
              <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>תמחור</h5>

              <Suspense>
                <div
                  id="grid-1"
                  className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size"}
                >
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay}
                    ref={gridRef}
                    rowHeight={25}
                    rowData={selectedPrograms}
                    columnDefs={pricingColDefs}
                    defaultColDef={defaultColDef}
                    enableRtl={true}
                    autoSizeStrategy={autoSizeStrategy}
                    onGridReady={onPricingGridReady}
                    domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>
          <Row>
            <Col >
              <div className="flex flex-row-reverse">
                <OverlayTrigger
                  placement={"top"}
                  overlay={<Tooltip className="absolute" id="tooltip-bottom">הוסף שורה</Tooltip>}
                >
                  <button
                    className="hover:bg-[#253d37] rounded"
                    onClick={onPaymentsAddRowToolBarClick}
                  >
                    <FcAddRow className="w-[37px] h-[37px]" />
                  </button>
                </OverlayTrigger>
                <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>תשלומים</h5>

              </div>
              <Suspense>
                <div
                  id="grid-2"
                  className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size" : "ag-theme-quartz custom-text-size"}
                >
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay}
                    ref={paymentsGridRef}
                    rowHeight={25}
                    rowData={selectedPayments}
                    columnDefs={paymentsColDef}
                    defaultColDef={defaultColDef}
                    enableRtl={true}
                    autoSizeStrategy={autoSizeStrategy}
                    onGridReady={onPaymentsGridReady}
                    onCellValueChanged={onPaymentCellValueChanged}
                    domLayout='autoHeight'
                  />
                </div>
              </Suspense>
            </Col>
          </Row>
          <Row >
            <Col    >
              <div className="flex flex-row-reverse">
                <OverlayTrigger
                  placement={"top"}
                  overlay={<Tooltip className="absolute" id="tooltip-bottom">הוסף שורה</Tooltip>}
                >
                  <button
                    className="hover:bg-[#253d37] rounded relative"
                    onClick={onPendingPaymentsAddRowToolBarClick}
                  >
                    <FcAddRow className="w-[37px] h-[37px]" />
                  </button>
                </OverlayTrigger>
                <h5 className={theme === "dark-theme" ? "text-white" : "text-black"}>תשלומים בדרך</h5>

              </div>
              <Suspense>
                <div
                  id="grid-3"
                  className={theme === "dark-theme" ? "ag-theme-quartz-dark custom-text-size overflow-visible " : "ag-theme-quartz custom-text-size overflow-visible "}
                >
                  <AgGridReact
                    noRowsOverlayComponent={CustomNoRowsOverlay}
                    ref={pendingPaymentsGridRef}
                    rowHeight={25}
                    rowData={selectedPendingPayments}
                    columnDefs={pendingPaymentsColDef}
                    defaultColDef={defaultColDef}
                    enableRtl={true}
                    autoSizeStrategy={autoSizeStrategy}
                    onGridReady={onPendingPaymentsGridReady}
                    singleClickEdit={true}
                    onCellValueChanged={onPendingPaymentCellValueChanged}
                    domLayout='autoHeight'
                  />



                </div>

              </Suspense>
              <div className="flex flex-row-reverse">
                <Button
                  className="move-row-btn w-[55px] h-[55px]"
                  onClick={handleMoveRow}>
                  סמן כשולם
                </Button>

                <h5 className={theme === "dark-theme" ? "text-white " : "text-black"}>{`${totalPrice - totalPayments}:נותר לתשלום`}</h5>
                {selectedSchool && (
                  <div className={theme === "dark-theme" ? "bg-[#1f2936] relative z-1 " : "bg-white relative z-1"}>
                    <h5>הערות</h5>
                    <Form.Control
                      as="textarea"
                      className={theme === "dark-theme" ? "bg-[#1f2936]" : "bg-white"}
                      rows={5}
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      onBlur={updateSchoolRow}
                      style={{ direction: "rtl", textAlign: "right" }}
                    />
                  </div>
                )}


              </div>


            </Col>
          </Row>

        </Col>
      </Row>
    </Container>

  )
}

export default PaymentsTable;