import React, { useCallback, useEffect, useState } from "react";
import {
  GridReadyEvent,
  CellValueChangedEvent,
  ICellRendererParams,
} from "ag-grid-community";
import { Guide, SchoolsContact } from "@prisma/client";

const CustomWhatsAppRenderer = (props: ICellRendererParams) => {
  const [ListenerActivated, setListenerActivated] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(props.data.CellPhone ? props.data.CellPhone : props.data.Cellphone);
  const [NameAndRole, setNameAndRole] = useState(props.value);
  useEffect(() => {
    let name = []
    name.push(props.data.FirstName)
    // role only exists if in schoolsContact
    name.push(props.data.Role)
    // again, setValue will allow the filter to work.
    if (phoneNumber) {
      props.setValue(name.join(' '))
    }


  }, [phoneNumber, props])
  const changedValue = useCallback(
    (event: CellValueChangedEvent) => {
      const row: any = props.node;
      if (props.node.data.Contactid === row.data.Contactid) {
        if (props.colDef.field === "Role" || props.colDef.field === "FirstName") {
          let name = []
          name.push(props.data.FirstName)
          name.push(props.data.Role)
          props.setValue(name.join(' '))
          setNameAndRole(name.join(' '));
        }
        if (props.colDef.field === "Cellphone") {
          setPhoneNumber(event.newValue);

        }
        event.api.redrawRows(row);
      }
    },
    [props]
  );
  useEffect(() => {
    const LoadListener = () => {
      if (props.api && !ListenerActivated) {

        setListenerActivated(true);
        props.api.addEventListener("cellValueChanged", changedValue)
      }
    }
    LoadListener()
    return () => {

      props.api.removeEventListener("cellValueChanged", changedValue)
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
          href={link}
          target="_blank"
          className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
        >
          {NameAndRole}
        </a>
      );
    }
  }, [phoneNumber, NameAndRole]);

  return getDetails();
};

export default CustomWhatsAppRenderer;