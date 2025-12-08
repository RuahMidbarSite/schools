import ColumnManagementWindow from "@/components/ColumnManagementWindow"



const useColumnComponent = (columnWindowOpen,setColumnWindowOpen,colDefinition,gridRef,colState,setColState):{WindowManager:any}=> {

  const getComponents = () => {

   return ( <ColumnManagementWindow
        show={columnWindowOpen}
        onHide={() => setColumnWindowOpen(false)}
        columnDefs={colDefinition}
        gridApi={gridRef.current?.api}
        colState={colState}
        setColState={setColState} />
                
   )

}
  return {WindowManager: getComponents}

 




}


export default useColumnComponent