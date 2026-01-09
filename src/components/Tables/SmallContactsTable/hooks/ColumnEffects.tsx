import { ColumnState } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback, useRef } from "react";
import { SmallContactsStoreColumns, getFromStorage, updateStorage } from "../Storage/SmallContactsColumnsStorage";

const useColumnEffects = (
  gridRef: MutableRefObject<AgGridReact<any>>, 
  colState: ColumnState[], 
  setColState, 
  SchoolID
): { updateColStateFromCache: any, updateColState: any } => {

  // תיקון קריטי: שמירה שהעדכון כבר בוצע כדי למנוע לולאה
  const hasAppliedState = useRef(false);

  const updateColStateFromCache = useCallback(() => {
    if (!(gridRef.current && gridRef.current.api)) { return; }
    
    getFromStorage().then(({ colState }: SmallContactsStoreColumns) => {
      if (colState) {
        setColState(colState);
      } else {
        const currentState = gridRef.current.api.getColumnState();
        setColState(currentState);
      }
    });
  }, [gridRef, setColState]);

  const updateColState = useCallback(() => {
    // תיקון קריטי: מניעת לולאה - עדכון רק פעם אחת
    if (colState.length > 0 && gridRef.current && gridRef.current.api) {
      
      // בדיקה אם כבר עדכנו את המצב הזה
      if (hasAppliedState.current) {
        return;
      }

      try {
        gridRef.current.api.applyColumnState({
          state: colState,
          applyOrder: true,
        });

        colState.forEach(column => {
          if (column.width) {
            gridRef.current.api.setColumnWidth(column.colId, column.width);
          }
        });

        updateStorage({ colState: colState });
        
        // סימון שהעדכון בוצע
        hasAppliedState.current = true;
        
      } catch (error) {
        console.error("Error applying column state:", error);
      }
    }
  }, [colState, gridRef]);

  return { 
    updateColStateFromCache: updateColStateFromCache, 
    updateColState: updateColState 
  };
}

export default useColumnEffects;