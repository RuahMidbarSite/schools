"use client";
import { ICellRendererParams } from "ag-grid-community";
import React, { useCallback, useEffect, useRef } from "react";
import { useState } from "react";
import { ActionMeta } from "react-select";

import "bootstrap/dist/css/bootstrap.min.css";
import { updateProfessions } from "@/db/instructorsrequest";
import { getModelFields, getProfessionAtIndex } from "@/db/generalrequests";

import AsyncSelect from "react-select/async";
import { Profession } from "@prisma/client";

// eslint-disable-next-line react/display-name
export const CustomMultiSelectCell = React.forwardRef(
  (props: any, ref: any) => {
    const [menuOpen, SetMenuOpen] = useState(false);
    var [Values, setValues] = useState([]);
    const [Redraw, setReDraw]: [number, any] = useState(0);
    const [currentOptions, setCurrentOptions] = useState([]);
    const LoadDataFlag = useRef(false);
    const Uref = useRef(null);
    const onChange = (
      event,
      context: ActionMeta<{ value: string; label: string }>
    ) => {
      const ID: number = props.data.Guideid;

      if (context.action === "select-option") {
        const selected_value = context.option.value;
        updateProfessions([selected_value], true, ID);
        // only three entries can fit in a row.
      }
      if (context.action === "remove-value") {
        const removed_value = context.removedValue.value;
        updateProfessions([removed_value], false, ID);
      }
      // clear removes all instead of just 1 (in remove-value)
      if (context.action === "clear") {
        updateProfessions(
          [...currentOptions.map((val) => val.value)],
          false,
          ID
        );
      }
    };

    const LoadData = async (): Promise<any> => {
      const ProfessionObject: Profession = await getProfessionAtIndex(
        props.data.Guideid
      );

      var list = [];
      var option_list = [];
      for (const field_name in ProfessionObject) {
        for (const option in currentOptions) {
          if (
            field_name === currentOptions[option].value &&
            typeof ProfessionObject[field_name] === "boolean" &&
            ProfessionObject[field_name] === true
          ) {
            const object_template = {
              value: field_name,
              label: currentOptions[option].label,
            };
            list.push(object_template);
          } else if (typeof ProfessionObject[field_name] === "boolean") {
            option_list.push({
              value: field_name,
              label: currentOptions[option].label,
            });
          }
        }
      }

      setValues([...list]);

      if (list.length != Values.length) {
        setReDraw((val) => !val);
      }

      return [...list];
    };

    const GetAllOptions = async (): Promise<any> => {
      const values = await getModelFields("Profession");
      var list = [];
      for (var i = 0; i < values[0].length; i++) {
        if (
          [
            "Objectid",
            "id",
            "Contactid",
            "Guideid",
            "GoogleContarct",
            "Status",
            "Contact",
            "Guide",
          ].includes(values[0][i])
        ) {
          continue;
        }
        const object_template = { value: values[0][i], label: values[1][i] };
        list.push(object_template);
      }
      setCurrentOptions([...list]);
      LoadDataFlag.current = true;
      return [...list];
    };

    useEffect(() => {
      //LoadData();
      // LoadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [LoadDataFlag.current]);

    // Onhover, z-1 will overlap z-0 elements ( which are the rows below)
    return (
      <>
        <div className="border-[white] w-[200px] h-[40px] absolute z-[0] overflow-y-scroll hover:h-[auto] hover:overflow-y-hidden hover:z-[1]">
          <AsyncSelect
            options={currentOptions}
            key={Redraw}
            defaultValue={Values}
            closeMenuOnSelect={false}
            isMulti
            unstyled
            cacheOptions
            defaultOptions
            loadOptions={GetAllOptions}
            name="Prof"
            menuIsOpen={menuOpen}
            onMenuOpen={() => SetMenuOpen(true)}
            onMenuClose={() => SetMenuOpen(false)}
            onChange={onChange}
            classNames={{
              control: () => "rounded-md bg-[#4075be]",
              multiValueLabel: (data) =>
                `border-[white] border-[2px]  bg-[#4075be]  `,
              menuList: () => " ",
              menuPortal: () => " ",
              placeholder: () => "bg-[#4075be] ",
              multiValue: () => " ",
              option: () => "hover:bg-sky-700 bg-neutral-300 ",
              menu: () => "",
              container: () => "",
            }}
            classNamePrefix="select"
            menuPlacement={"auto"}
            menuPosition={"fixed"}
            menuPortalTarget={document.body}
            //components={{ Control: CustomSelectProp, Placeholder: () => null }}
            noOptionsMessage={() => null}
          />
        </div>
      </>
    );
  }
);
