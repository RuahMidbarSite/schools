
"use client"
import { OtherComponentsObject } from "@/util/cache/cachetypes";
import { useCallback, useMemo } from "react";





const useExternalUpdate = (AuthenticateActivate):{other_components:any,ValueFormatSchool:any,ValueFormatWhatsApp:any,valueFormatCellPhone:any}=> {
     const ValueFormatSchool = useCallback((params) => {
    const data = params.column.getColDef().cellEditorParams;
    const value: number = params.value;
    const name: string = data?.names[value - 1];
    if (name && value) {
      return `${params.value} - ${name}`;
    }
    if(value) {
          return `${value}`;
    }
    return null;
  }, []);
  const ValueFormatWhatsApp = useCallback((params) => {
    const { FirstName, Role } = params.data;
    return `${FirstName} ${Role}`;
  }, []);

    const valueFormatCellPhone = useCallback((params) => {
     let phone
    if(params.data && params.data.Cellphone) {
    let { Cellphone }: { Cellphone: string } = params?.data
    phone = Cellphone
   }
    if(!phone) { phone = params?.value}
    // Remove the country code (+972) and hyphens (-)
     const formattedPhone = phone?.replace('+972', '')
                                 .replace(/[-\s]/g, '')
                                 .replace(/^0/, '');
    return formattedPhone

  }, [])
  const other_components: OtherComponentsObject = useMemo(
    () => ({
      GoogleFunctions: {
        AggridFieldName: "cellRendererParams",
        ApplyArrOrString: ["GoogleContactLink"],
        Func: { GoogleFunctions: AuthenticateActivate },
      },
      FormatSchool: {
        AggridFieldName: "valueFormatter",
        ApplyArrOrString: ["Schoolid"],
        Func: ValueFormatSchool,
      },
      FormatWhatsApp: {
        AggridFieldName: "valueGetter",
        ApplyArrOrString: ["WhatsppLink"],
        Func: ValueFormatWhatsApp,
      },
       FormatCellPhone: {
        AggridFieldName: "valueGetter",
        ApplyArrOrString: ["Cellphone"],
        Func: valueFormatCellPhone,
      },
    }),
    [AuthenticateActivate, ValueFormatSchool, ValueFormatWhatsApp, valueFormatCellPhone]
  );

  return {other_components:other_components,ValueFormatSchool:ValueFormatSchool,ValueFormatWhatsApp:ValueFormatWhatsApp,valueFormatCellPhone:valueFormatCellPhone}
}

export default useExternalUpdate