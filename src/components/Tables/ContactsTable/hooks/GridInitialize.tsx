import { getAllContacts } from "@/db/contactsRequests";
import { getAllStatuses, getModelFields, getRoles } from "@/db/generalrequests";
import { getAllSchools } from "@/db/schoolrequests";

import { Role, School, SchoolsContact, StatusContacts } from "@prisma/client";
import { useCallback } from "react";
import { BigContactsStoreData, DataType, getFromStorage, updateStorage } from "../Storage/BigContactsDataStorage";
import useUpdateCacheColumn from "./UpdateCacheColumn";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";



const useGridFunctions = (valueFormatCellPhone, AuthenticateActivate, ValueFormatSchool, ValueFormatWhatsApp, setRowData, setColDefs, dataRowCount, rowCount,maxIndex) => {

  const GetDefaultDefinitions = useCallback(
    ([Schools, model, Roles, statuses]) => {
      var colD = [
        ...model[0]?.map((value: any, index: any) => {
          // no edit here..
          if (value === "Contactid") {
            return {
              field: value,
              headerName: model[1][index],
              rowDrag: false,
              sortable: true,
              suppressMovable: true,
              cellEditor: "agTextCellEditor",
              checkboxSelection: true,
              headerCheckboxSelection: true,
              headerCheckboxSelectionFilteredOnly: true,
              headerCheckboxSelectionCurrentPageOnly: true,
              lockVisible: true,
            };
          }
          if (value === "Cellphone") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellEditor: "agTextCellEditor",
              filter: "CustomFilter",
              valueFormatter: valueFormatCellPhone,
              cellEditorParams: {
                useFormatter: true
              },
            };
          }

          if (value === "Email") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellEditor: "agTextCellEditor",
              cellRenderer: "CustomLink",
              filter: "CustomFilter",
            };
          }
          if (value === "GoogleContactLink") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "agTextCellEditor",
              cellRenderer: "CustomLinkContact",
              cellRendererParams: {
                GoogleFunctions: AuthenticateActivate,
              },
              filter: false,
            };
          }
          if (value === "Profession") {
            return {
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellRenderer: "CustomMultiSelect",
            };
          }
          if (value === "IsRepresentive") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellRenderer: 'agCheckboxCellRenderer',
              cellEditor: "agCheckboxCellEditor",
              cellEditorParams: {
                // Optional: initial value to show in the checkbox
                initialValue: true, // or false
              },
              filter: "CustomFilter",
            };
          }
          if (value === "Role") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellEditor: CustomSelectCellEditor,
              cellEditorParams: {
                values: Roles.map((val) => val.RoleName),
              },
              filter: "CustomFilter",
            }
          }
          if (value === "Status") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellEditor: CustomSelectCellEditor,
              cellEditorParams: {
                values: statuses.map((val) => val.StatusName),
              },
              filter: "CustomFilter",
            }
          }
          return {
            field: value,
            headerName: model[1][index],
            editable: true,
            singleClickEdit: true,
            cellEditor: "agTextCellEditor",
            filter: "CustomFilter",
          };
        }),
      ];
      const schoolId: Object = {
        field: "Schoolid",
        headerName: "מזהה בית ספר",
        editable: true,
        singleClickEdit: true,
        cellEditor: CustomSelectCellEditor,
        cellEditorParams: {
          values: Schools.map((val) => val.SchoolName),
          valueListMaxWidth: 120,
          cities: Schools.map((val: School) => val.City),
          ids: Schools.map((val: School) => val.Schoolid)
        },
        filter: "CustomFilter",
        valueFormatter: ValueFormatSchool
      };
      colD[1] = schoolId;
      const whatsappLink = {
        field: "WhatsppLink",
        headerName: "וואטסאפ",
        editable: false,
        valueGetter: ValueFormatWhatsApp,
        cellRenderer: "CustomWhatsAppRenderer",
        filter: false,
      };
      colD.splice(7, 0, whatsappLink);
      return colD;
    },
    [AuthenticateActivate, ValueFormatSchool, ValueFormatWhatsApp, valueFormatCellPhone]
  );
  const getTableData = useCallback(
    async (): Promise<any> => {

      return Promise.all([
        getAllContacts(),
        getAllSchools(),
        getModelFields("SchoolsContact"),
        getRoles(),
        getAllStatuses("Contacts")
      ]);
    }, []
  );


  const onGridReady = useCallback(
    async (params) => {
      getFromStorage().then(({ schoolsContacts, Schools, Tablemodel, ContactsStatuses, Role }: DataType) => {
        if (schoolsContacts && Schools && Tablemodel && ContactsStatuses && Role) {
          const colDef = GetDefaultDefinitions([Schools, Tablemodel, Role, ContactsStatuses]);
          setRowData(schoolsContacts)
          setColDefs(colDef)
          dataRowCount.current = schoolsContacts?.length
          rowCount.current = schoolsContacts?.length

          if (schoolsContacts?.length === 0) {
            params.api.hideOverlay();
          }
           maxIndex.current = schoolsContacts?.length >0 ? Math.max(...schoolsContacts.map((contact)=>contact.Contactid)):0


        } else {
          getTableData().then((res) => {
            const [schoolsContacts, Schools, model, roles, statuses]: [
              SchoolsContact[],
              School[],
              any,
              Role[],
              StatusContacts[],
            ] = res;

            var colD = GetDefaultDefinitions([Schools, model, roles, statuses]);
            dataRowCount.current = schoolsContacts.length
            rowCount.current = schoolsContacts.length
            setColDefs(colD);
            setRowData(schoolsContacts);
            updateStorage({ schoolsContacts: schoolsContacts, Tablemodel: model, Role: roles, ContactsStatuses: statuses })

             maxIndex.current = schoolsContacts.length > 0 ? Math.max(...schoolsContacts.map((contact)=>contact.Contactid)):0

          })
        }

      })
    }, [GetDefaultDefinitions, dataRowCount, getTableData, maxIndex, rowCount, setColDefs, setRowData])

  return { onGridReady: onGridReady }


}

export default useGridFunctions