import { columnsDefinition, OtherComponentsObject } from "@/util/cache/cachetypes"
import useExternalUpdate from "./ExternalUpdateAgGridComponents"





const useUpdateCacheColumn = (AuthenticateActivate):{UpdateColumnsAfterCache:(colDef:columnsDefinition)=>columnsDefinition} => {
  // Ag grid does not save functions that are not cellrenderer or celledit, so we manually update.
  // Only put here functions that return different output depending on the params.
  const {other_components}: OtherComponentsObject = useExternalUpdate(AuthenticateActivate)

  const UpdateColumnsAfterCache =(colDef:columnsDefinition):columnsDefinition => {
      
      for (const key in  other_components ) {
                const component = other_components[key]
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