import { columnsDefinition, OtherComponentsObject } from "@/util/cache/cachetypes"
import useExternalUpdate from "./ExternalUpdateAgGridComponents"





const useUpdateCacheColumn = ():{UpdateColumnsAfterCache:(colDef:columnsDefinition)=>columnsDefinition} => {
  // Ag grid does not save functions that are not cellrenderer or celledit, so we manually update.
  // Only put here functions that return different output depending on the params.
  const components: OtherComponentsObject = useExternalUpdate()

  const UpdateColumnsAfterCache =(colDef:columnsDefinition):columnsDefinition => {
      
      for (const key in  components ) {
                const component = components[key]
                const field = component.AggridFieldName
                  colDef =  colDef.map((val)=>{
                          if(component.ApplyArrOrString ==="All" || typeof component.ApplyArrOrString === "object" && component.ApplyArrOrString.includes(val.field)) {
                               val[field] = component.Func
                               return val
                          }
                         else {
                            return val
                        }
                         
                  })
                      
          }
    return colDef
  }

      


   return {UpdateColumnsAfterCache:UpdateColumnsAfterCache}


}

export default useUpdateCacheColumn