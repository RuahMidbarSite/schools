import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";




const useColumnHooks = (gridRef:MutableRefObject<AgGridReact<any>>,colDefinition,setColDefs,setColState,colState)=> {
 

  const onColumnResized = useCallback((event) => {
    if (event.finished) {
      if (gridRef.current && gridRef.current.api) {
        const newColState = gridRef.current.api.getColumnState();

          // we check because the useeffect can use setColumnWidth which activates this event.
        if (JSON.stringify(newColState) !== JSON.stringify(colState)) {
              setColState(newColState)
         }
        
        
      }
    }
  }, [colState, gridRef, setColState]);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      const newColState = gridRef.current.api.getColumnState();
      if (JSON.stringify(newColState) !== JSON.stringify(colState)) {
              setColState(newColState)
         }

    }
  }, [colState, gridRef, setColState]);


  
   return { onColumnMoved:onColumnMoved,onColumnResized:onColumnResized }
} 


export default useColumnHooks