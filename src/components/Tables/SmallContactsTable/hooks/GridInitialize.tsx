import { getAllContacts, getCountContacts, getSchoolContacts } from "@/db/contactsRequests";
import { getAllStatuses, getModelFields, getRoles } from "@/db/generalrequests";
import { getAllSchools } from "@/db/schoolrequests";

import { Role, School, SchoolsContact, StatusContacts, StatusSchools } from "@prisma/client";
import { useCallback } from "react";
import { SmallContactsStoreData, updateStorage, getFromStorage, DataType } from "../Storage/SmallContactsDataStorage";

import { GridReadyEvent } from "ag-grid-community";
import useUpdateCacheColumn from "./UpdateCacheColumn";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import CustomLink from "@/components/CellComponents/General/CustomLink";
import { CustomLinkContact } from "../../GeneralFiles/GoogleContacts/CustonLinkContact";
import CustomLinkContacts from "@/components/CellComponents/General/CustomLinkSchools";



const useGridFunctions = (valueFormatCellPhone, AuthenticateActivate, ValueFormatSchool, ValueFormatWhatsApp, setRowData, setColDefs, dataRowCount, rowCount, SchoolID, setAllContacts, allContactsCount, maxIndex) => {
  const { UpdateColumnsAfterCache } = useUpdateCacheColumn(AuthenticateActivate)

  const GetDefaultDefinitions = useCallback(
    ([model, Roles, statuses]: [any, Role[], StatusContacts[]]) => {
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
            };
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

          if (value === "Cellphone") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellEditor: "agTextCellEditor",
              filter: "CustomFilter",
              valueGetter: valueFormatCellPhone
            };
          }

          if (value === "Email") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              singleClickEdit: true,
              cellEditor: "agTextCellEditor",
              cellRenderer: CustomLinkContacts,
              filter: "CustomFilter",
            };
          }
          if (value === "GoogleContactLink") {
            return {
              field: value,
              headerName: 'גוגל',
              editable: true,
              cellEditor: "agTextCellEditor",
              cellRenderer: CustomLinkContact,
              cellRendererParams: {
                GoogleFunctions: AuthenticateActivate,
              },
              filter: false,
            };
          }
          if (value === "Profession") {
            return {
              headerName: model[1][index],
              getColId: (params) => "Professions",
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
              singleClickEdit: false,
              cellRenderer: 'agCheckboxCellRenderer',
              cellEditor: "agCheckboxCellEditor",
              cellEditorParams: {
                initialValue: false, // or false
              },
              filter: "CustomFilter",
            };
          }
          if (value === "Role") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: CustomSelectCellEditor,
              singleClickEdit: true,
              cellEditorParams: {
                values: Roles.map((val) => val.RoleName),
                valueListMaxWidth: 120
              },

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
        hide: true,
        editable: false,
        cellEditor: "agSelectCellEditor",
        filter: "CustomFilter",
        valueFormatter: ValueFormatSchool
      };
      colD[1] = schoolId;
      const whatsappLink = {
        field: "WhatsppLink",
        headerName: "וואטסאפ",
        getColId: (params) => "WhatsappLink",
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
        getModelFields("SchoolsContact"),
        getRoles(),
        getAllStatuses("Contacts"),
        getAllSchools()
      ]);
    }, []
  )

  const onGridReady = useCallback(
    async (params: GridReadyEvent) => {
      getFromStorage().then(({ schoolsContacts, Role, Tablemodel, ContactsStatuses, Schools }: DataType) => {
        if (schoolsContacts && Role && Tablemodel && Schools) {
          let colDefintion = GetDefaultDefinitions([Tablemodel, Role, ContactsStatuses])

          setAllContacts(schoolsContacts)
          allContactsCount.current = schoolsContacts.length

          let shown_data = schoolsContacts.filter((contact) => contact.Schoolid === SchoolID)
          setRowData(shown_data)
          rowCount.current = shown_data.length
          dataRowCount.current = shown_data.length
          setColDefs(colDefintion)
          maxIndex.current = schoolsContacts.length > 0 ? Math.max(...schoolsContacts.map((contact) => contact.Contactid)) : 0

          if (schoolsContacts.length === 0) {
            params.api.hideOverlay();
          }
        } else {
          getTableData().then((res) => {
            const [schoolsContacts, model, Roles, Statuses, schools]: [
              SchoolsContact[],
              any,
              Role[],
              StatusSchools[],
              School[]
            ] = res;
            let colDefintion = GetDefaultDefinitions([model, Roles, Statuses])

            setAllContacts(schoolsContacts)
            allContactsCount.current = schoolsContacts.length

            let shown_data = schoolsContacts.filter((contact) => contact.Schoolid === SchoolID)
            setRowData(shown_data)
            rowCount.current = shown_data.length
            dataRowCount.current = shown_data.length
            setColDefs(colDefintion)

            maxIndex.current = schoolsContacts.length > 0 ? Math.max(...schoolsContacts.map((contact) => contact.Contactid)) : 0

            updateStorage({ schoolsContacts: schoolsContacts, Tablemodel: model, Role: Roles, Schools: schools, ContactsStatuses: Statuses })


          })
        }
      })
    }, [GetDefaultDefinitions, SchoolID, allContactsCount, dataRowCount, getTableData, rowCount, setAllContacts, setColDefs, setRowData, maxIndex])

  return { onGridReady: onGridReady }


}

export default useGridFunctions