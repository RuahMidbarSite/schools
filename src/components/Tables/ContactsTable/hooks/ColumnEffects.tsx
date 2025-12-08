import { ColumnState } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";
import { BigContactsStoreColumns, getFromStorage, updateStorage } from "../Storage/BigContactsColumnsStorage";


const useColumnEffects = (gridRef:MutableRefObject<AgGridReact<any>>, colState:ColumnState[], setColState):{updateColStateFromCache:any, updateColState:any } => {

  const updateColStateFromCache = useCallback(()=>{

    if (!(gridRef.current && gridRef.current.api)) { return }
    getFromStorage().then(({ colState }: BigContactsStoreColumns) => {
      if (colState) {
        setColState(colState)

      }
      else {
        colState = gridRef.current.api.getColumnState();
        setColState(colState)
      }

    })




},[gridRef, setColState])

  const updateColState = useCallback(()=>{
      if (colState.length > 0) {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyColumnState({
          state: colState,
          applyOrder: true,
        });
        colState.forEach(column => {
          if (column.width) {
            gridRef.current.api.setColumnWidth(column.colId, column.width);
          }
        });
        updateStorage({colState:colState})
      }
    }




   // eslint-disable-next-line react-hooks/exhaustive-deps
   },[colState])


   return {updateColStateFromCache:updateColStateFromCache, updateColState:updateColState }

}

export default useColumnEffects