import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";



const useColumnHook = (gridRef:MutableRefObject<AgGridReact<any>>,colDefinition,setColDefs,setColState,colState)=> {
 
   const onColumnResized = useCallback((event) => {
    if (event.finished) {
      if (gridRef.current && gridRef.current.api) {
        const newColState = gridRef.current.api.getColumnState();
        setColState((prevColState) => {
          if (JSON.stringify(prevColState) !== JSON.stringify(newColState)) {
            return newColState;
          }
          return prevColState;
        });
      }
    }

  }, [gridRef, setColState]);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      const colState = gridRef.current.api.getColumnState();
      setColState(colState);
    }
  }, [gridRef, setColState]);

    return { onColumnMoved:onColumnMoved,onColumnResized:onColumnResized }

}

export default useColumnHook