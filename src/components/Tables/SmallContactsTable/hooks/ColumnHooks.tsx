import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback, useEffect } from "react";

// פונקציה שמייצרת מפתח ייחודי לפי מזהה הטבלה
const getStorageKey = (id: string | number) => `grid_column_state_${id}`;

const useColumnHook = (gridRef: MutableRefObject<AgGridReact<any>>, setColState, tableId: string | number = "general") => {
 
  const storageKey = getStorageKey(tableId);

  // --- טעינה אוטומטית ברגע שהטבלה מוכנה ---
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState && gridRef.current?.api) {
      try {
        const parsedState = JSON.parse(savedState);
        gridRef.current.api.applyColumnState({
          state: parsedState,
          applyOrder: true,
        });
        setColState(parsedState);
      } catch (e) {
        console.error("Error loading column state", e);
      }
    }
  }, [gridRef, storageKey, setColState]);

  const onColumnResized = useCallback((event) => {
    if (event.finished && gridRef.current?.api) {
      const newColState = gridRef.current.api.getColumnState();
      localStorage.setItem(storageKey, JSON.stringify(newColState)); // שמירה
      setColState(newColState);
    }
  }, [gridRef, setColState, storageKey]);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current?.api) {
      const newColState = gridRef.current.api.getColumnState();
      localStorage.setItem(storageKey, JSON.stringify(newColState)); // שמירה
      setColState(newColState);
    }
  }, [gridRef, setColState, storageKey]);

  return { onColumnMoved, onColumnResized }
}

export default useColumnHook;