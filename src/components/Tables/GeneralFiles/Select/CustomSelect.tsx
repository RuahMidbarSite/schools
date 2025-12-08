"use client";
import { ICellRendererParams } from "ag-grid-community";
import React, { useCallback, useContext } from "react";
import { useState } from "react";
import { School, ReligionSector, Cities, SchoolsContact } from "@prisma/client";
import Select, { ActionMeta, OnChangeValue, StylesConfig } from "react-select"; // later will probably add it...
import { ThemeContext } from "@/context/Theme/Theme";

interface CellSelect extends ICellRendererParams {
  selectData: any;
}

// eslint-disable-next-line react/display-name
export const CustomSelect = React.forwardRef((props: CellSelect, ref: any) => {
  const [CurrentlySelected, UpdateSelect] = useState(getDefault());
  const { theme } = useContext(ThemeContext);
  const lightTheme = {
    controlBackground: "#ffffff",
    controlTextColor: "#000000",
    optionBackground: "#ffffff",
    optionTextColor: "#333333",
  };

  const darkTheme = {
    controlBackground: "#1f2936",
    controlTextColor: "#ffffff",
    optionBackground: "#2f3545",
    optionTextColor: "#ffffff",
  };

  const currentTheme = theme === "dark-theme" ? darkTheme : lightTheme;

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: currentTheme.controlBackground,
      color: currentTheme.controlTextColor,
      border: "none",
      boxShadow: "none",
      
      "&:hover": {
        borderColor: "#888",
      },
      minHeight: "100%",
      minWidth: "100%",
      height: "100%",
      width: "100%",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: currentTheme.controlTextColor,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#e0e0e0" : currentTheme.optionBackground,
      color: state.isSelected ? "#000" : currentTheme.optionTextColor,
    }),
    container: (provided) => ({
      ...provided,
      minHeight: "100%",
      minWidth: "100%",
      height: "100%",
      width: "100%",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      display: "none",
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      display: "none",
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 1, 
      
      
    }),
    menuPortal: (base) => ({
          ...base,
          zIndex: 1 // Ensure the portal itself is on top
        }),
     menuList: (provided) => ({
     marginTop: 0, // Remove top margin
    marginBottom: 0, // Remove bottom margin
    padding: 0, // Remove padding
    borderRadius: 0, // Optional: Remove border radius
    boxShadow: 'none', // Optional: Remove box shadow
    zIndex: 100, // Ensure it's above other elements
  }),

  };


  const onMenuOpen = () => {
    const optionElement = document.querySelector(
      `[value="${CurrentlySelected}"]`
    );
    if (optionElement) {
      optionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function getDefault(): any {
    if ((props.colDef!.field as string) === "City") {
      return props.data.City;
    }
    if ((props.colDef!.field as string) === "Representive") {
      return props.data.Representive;
    }
    if ((props.colDef!.field as string) === "CityName") {
      return props.data.CityName;
    }
    return ""
  }

  const onChange = (
    newValue: OnChangeValue<any, false>,
    actionMeta: ActionMeta<any>
  ) => {
   
   props.node.setDataValue(props.colDef.field as string, newValue.value);
    

  };

  const getOptions = () => {
    if ((props.colDef!.field as string) === "City" || (props.colDef!.field as string) === "CityName") {
      return props.selectData;
    }
    if ((props.colDef!.field as string) === "Representive") {
      const contacts: SchoolsContact[] = props.selectData;

      const filtered_contacts = contacts?.filter(
        (val) => val.Schoolid === props.data.Schoolid
      );

      const options = filtered_contacts.map((val) => ({
        value: val.FirstName!.concat(" ", val.LastName!),
        label: val.FirstName!.concat(" ", val.LastName!),
      }));
      return options;
    }
  };
  return (
    // default value is bypass to a bug that does not take the initial default value and scroll into it.
    <div className="overflow-y-visible ">
      <Select
        className="basic-single"
        classNamePrefix="select"
        isRtl={true}
        placeholder={getDefault()}
        defaultValue={getOptions().find(
          (option: any) => option.value === getDefault()
        )}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        options={getOptions()}
        styles={customStyles}
        onMenuOpen={onMenuOpen}
        controlShouldRenderValue={true}
        isSearchable={true}
        menuPlacement={"top"}
        onChange={onChange}
      />
    </div>
  );
});
