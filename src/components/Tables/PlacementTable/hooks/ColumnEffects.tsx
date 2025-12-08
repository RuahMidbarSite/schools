"use client"
import { ColumnState } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";
import { getFromStorage, PlacementStoreColumns, updateStorage } from "../Storage/PlacementColumnsStorage"
import { FaLeftRight } from "react-icons/fa6";



const useColumnEffects = (gridRef: MutableRefObject<AgGridReact<any>>, colStates: ColumnState[], setColState, RightColDef, LeftgridRef, leftColDef): { updateColStateFromCache: any, updateColState: any } => {
  const updateColStateFromCache = useCallback(async () => {
    if (!(gridRef.current && gridRef.current.api)) { return }
    getFromStorage().then(({ colState }: PlacementStoreColumns) => {

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
    if (colStates.length > 0) {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyColumnState({
          state: [...colStates],
          applyOrder: true,
        });
        LeftgridRef.current.api.applyColumnState({
          state: [...colStates],
          applyOrder: true,
        });


        colStates.forEach(column => {
          if (column.width) {
            gridRef.current.api.setColumnWidth(column.colId, column.width);
            LeftgridRef.current.api.setColumnWidth(column.colId, column.width);
          }
          return column
        });

        const schoolColumn = (gridRef.current.api.getColumnState())[0]
        gridRef.current.api.applyColumnState({
          state: [{ ...schoolColumn }],
          applyOrder: true,
        });
        const columns = (LeftgridRef.current.api.getColumnState())[0]
        LeftgridRef.current.api.applyColumnState({
          state: [{ ...columns }],
          applyOrder: true,
        });


        updateStorage({ colState: colStates })
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colStates])

  return { updateColStateFromCache: updateColStateFromCache, updateColState: updateColState }

}

export default useColumnEffects