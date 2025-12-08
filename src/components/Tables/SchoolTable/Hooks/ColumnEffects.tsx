"use client"
import { ColumnState } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";
import { getFromStorage, SchoolStoreColumns, updateStorage } from "../Storage/SchoolColumnsStorage";



const useColumnEffects = (gridRef: MutableRefObject<AgGridReact<any>>, colState: ColumnState[], setColState): { updateColStateFromCache: any, updateColState: any } => {
  const updateColStateFromCache = useCallback(async () => {
    if (!(gridRef.current && gridRef.current.api)) { return }
    getFromStorage().then(({ colState }: SchoolStoreColumns) => {
      if (colState) {
        setColState(colState)

      }
      else {
        colState = gridRef.current.api.getColumnState();
        setColState(colState)
      }

    })

  }, [gridRef, setColState])


  const updateColState = useCallback(async () => {
    if (colState.length > 0) {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyColumnState({
          state: [...colState],
          applyOrder: true,
        });


        colState.forEach(column => {
          if (column.width) {
            gridRef.current.api.setColumnWidth(column.colId, column.width);
          }
          return column
        });

        const schoolColumn = (gridRef.current.api.getColumnState())[0]
        gridRef.current.api.applyColumnState({
          state: [{ ...schoolColumn }],
          applyOrder: true,
        });

        updateStorage({colState:colState})
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colState])

  return { updateColStateFromCache: updateColStateFromCache, updateColState: updateColState }

}

export default useColumnEffects