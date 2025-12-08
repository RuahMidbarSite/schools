import React, { forwardRef, useCallback, useEffect, useState } from "react";
import {
  GridReadyEvent,
  CellValueChangedEvent,
  ICellRendererParams,
} from "ag-grid-community";

const CustomWhatsAppRenderer = forwardRef((props: ICellRendererParams,ref:any) => {
  
  const [phoneNumber, setPhoneNumber] = useState(props.data.Cellphone);
  const [NameAndRole, setNameAndRole] = useState(props.value);
  const changedValue = useCallback(
    (event: CellValueChangedEvent) => {
      const row: any = props.node;
      if (props.node.data.Contactid === row.data.Contactid) {
        if (props.colDef.field === "Role" || props.colDef.field === "FirstName") {
          setNameAndRole(event.data.FirstName + ' ' + event.data.Role);
        }
        if (props.colDef.field === "Cellphone") {
          setPhoneNumber(event.newValue);
        }
        event.api.redrawRows(row);
      }
    },
    [props.colDef.field, props.node]
  );
  useEffect(() => {
    const LoadListener = () => {
          if (props.api) {
         
      props.api.addEventListener("cellValueChanged",changedValue)
    }
   }
     LoadListener()
     return ()=> {
        
        props.api.removeEventListener("cellValueChanged",changedValue) 
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Check if the link is not empty before rendering the anchor tag
  const getDetails = useCallback(() => {
    if (phoneNumber && NameAndRole) {
          // making sure it is formatted before use
          const formattedPhone = phoneNumber.replace('+972', '').replace(/[-\s]/g, '');
      const link = `whatsapp://send/?phone=972${formattedPhone}`;
      return (
        <a
          ref={ref}
          href={link}
          target="_blank"
          className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
        >
          {NameAndRole}
        </a>
      );
    }
  }, [phoneNumber, NameAndRole, ref]);

  return getDetails();
});

export default CustomWhatsAppRenderer;

CustomWhatsAppRenderer.displayName="CustomWhatsAppRenderer"