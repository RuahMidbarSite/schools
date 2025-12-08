
"use client"
import { OtherComponentsObject } from "@/util/cache/cachetypes";
import { useCallback, useMemo } from "react";
import { CustomDateCellEditor } from "../../GeneralFiles/Date/CustomDateCellEditor/CustomDateCellEditor";




const useExternalUpdate = ():OtherComponentsObject=> {

  const valueFormatterDate = useCallback((params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [])
     // Ag grid does not save functions that are not cellrenderer or celledit, so we manually update.
  // Only put here functions that return different output depending on the params.
  const nonCellRendererOrEdit_components: OtherComponentsObject = useMemo(
    () => ({
      valueFormatterDate: { AggridFieldName: "valueFormatter", ApplyArrOrString: ["Date"], Func: valueFormatterDate },
      cellEditor: { AggridFieldName: "cellEditor", ApplyArrOrString: ["Date"], Func: CustomDateCellEditor },
      // isEditable:{AggridFieldName:"editable",ApplyArrOrString:"All", Func:isEditable},
    }),
    [valueFormatterDate]
  );

  return nonCellRendererOrEdit_components
}

export default useExternalUpdate