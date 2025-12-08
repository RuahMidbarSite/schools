"use client";
import { ICellRendererParams } from "ag-grid-community";
import React, { useCallback, useEffect, useRef } from "react";
import { useState } from "react";
import {
  School,
  ReligionSector,
  Cities,
  SchoolsContact,
  Assigned_Guide,
  Guide,
  Profession,
} from "@prisma/client";
import Select, {
  ActionMeta,
  OnChangeValue,
  StylesConfig,
  components,
} from "react-select"; 
import "bootstrap/dist/css/bootstrap.min.css";
import { updateProfessions } from "@/db/instructorsrequest";
import { getAllProfessions, getProfessionAtIndex } from "@/db/generalrequests";
interface CellSelect extends ICellRendererParams {
  SelectData: any;
}
import AsyncSelect from "react-select/async";
import { Col, Container, Row } from "react-bootstrap";
export type CustomMultiEvent = {
  type: "ChangedMultiSelect";
  action?: "select-option" | "remove-value" | "clear";
  data?: any;
};

export const colourOptions: any[] = [
  { value: 10, label: "Ocean" },
  { value: 9, label: "Blue" },
  { value: 8, label: "Purple" },
  { value: 7, label: "Red" },
  { value: 6, label: "Orange" },
  { value: 5, label: "Yellow" },
  { value: 4, label: "Green" },
  { value: 3, label: "Forest" },
  { value: 2, label: "Slate" },
  { value: 1, label: "Silver" },
];

// Handle click event to prevent menu closing
const handleClick = (event) => {
};
const PlaceHolder = ({ children, ...props }: any) => (
  <components.Placeholder {...props}>
   <components.Placeholder {...props}>
     
   </components.Placeholder>
  </components.Placeholder>
);
const CustomValueContainer = ({ children, ...props }: any) => {


return (

  <components.MultiValueContainer {...props}>
  {children}
 
</components.MultiValueContainer>
  
)
}
// eslint-disable-next-line react/display-name
export const CustomMultiSelectCellEdit = React.forwardRef((props: any, ref: any) => {
  const [menuOpen, SetMenuOpen] = useState(true);
  var [Values, setValues] = useState([]);
  const [AddedAmount,setAddedAmount] = useState(0)
  const onChange = (event, context) => {
    var dispatch_event: CustomMultiEvent = {
      type: "ChangedMultiSelect",
      data: event,
    };

    if (context.action === "select-option") {
      dispatch_event.action = "select-option";
      // setAddedAmount((val)=>val+1)
      //  const height:number = props.node.rowHeight
      //   if(height*3 < 40 * (AddedAmount+1)) {
      //         props.node.setRowHeight(height*3  + 40)
      //         setAddedAmount(0)
      //    }
    }
    if (context.action === "remove-value") {
      dispatch_event.action = "remove-value";
    }
    // clear removes all instead of just 1 (in remove-value)
    if (context.action === "clear") {
      dispatch_event.action = "clear";
    }

    props.api.dispatchEvent(dispatch_event);
  };

  const LoadData = async (): Promise<any> => {
    const values = await getProfessionAtIndex(props.data.id);

    var list = [];
    for (const key in values) {
      if (typeof values[key] === "boolean") {
        const object_template = { value: key, label: key, };
        list.push(object_template);
      }
    }
    setValues([...list])
    return [...list];
  };

  useEffect(() => {
    // LoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // TODO: Maybe change design.
    <div className="relative">
      <div className="border-[white] fixed w-[200px]   ">
        <AsyncSelect
          closeMenuOnSelect={false}
          isMulti
          unstyled
          cacheOptions
          defaultOptions
          loadOptions={LoadData}
          name="colors"
          //options={Values}
          menuIsOpen={menuOpen}
          onMenuClose={() => SetMenuOpen(false)}
          onMenuOpen={() => SetMenuOpen(true)}
          onChange={onChange}
          classNames={{
            control: () => "rounded-md bg-[#4075be]",
            multiValueLabel: (data) =>
              `border-[white] border-[2px]  bg-[#4075be]  `,

            placeholder: () => "bg-[#4075be]  ",
            multiValue: ()=> "",
            option: () => "hover:bg-sky-700 sticky   ",
            menu: () => " "
            
          }}
          classNamePrefix="select"
          components={{}}
          noOptionsMessage={() => null}
        />
      </div>
    </div>
  );
});
