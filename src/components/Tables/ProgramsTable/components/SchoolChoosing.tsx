import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Select, { ActionMeta, OnChangeValue } from "react-select";
import { Program, School } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { ThemeContext } from "@/context/Theme/Theme";

interface CustomSchoolChoosing extends ICellRendererParams<Program> {
  AllSchools: School[];
}

// eslint-disable-next-line react/display-name
export const SchoolChoosing = React.forwardRef(({ AllSchools, ...props }: CustomSchoolChoosing, ref: any) => {
  const [School, setSchool] = useState(props.data?.SchoolName);
  const [SchoolLabel, setSchoolLabel] = useState(props.data.SchoolName?.concat(`-${props.data.CityName ? props.data.CityName : 'ללא עיר'}`))
  const selectRef = useRef<any>(null); // Reference for the Select component
  const { theme } = useContext(ThemeContext);

  const getLabel = useCallback((Name: string, City: string) => {
    const label = Name?.concat(`-${City ? City : 'ללא עיר'}`)
    return label
  }, [])

  /** We need this useEffect in case we change the school details in school table to update the other fields  */
  useEffect(() => {
    // בדיקה שהפרופס קיימים לפני שרצים
    if (!AllSchools || !props.data) return;

    const school: School = AllSchools.find((val) => val.SchoolName === props.data.SchoolName && getLabel(val.SchoolName, val.City) === getLabel(props.data.SchoolName, props.data.CityName));
    const data: Program = props.data;

    if (school && (
      data?.CityName !== school?.City ||
      data?.Schoolid !== school?.Schoolid ||
      data?.EducationStage !== school?.EducationStage
    )) {
      // === כאן בוצע התיקון: CityName -> City ===
      props.node.setDataValue("City", school?.City);
      props.node.setDataValue("Schoolid", school?.Schoolid);
      props.node.setDataValue("EducationStage", school?.EducationStage);
      
      props.api.refreshCells({
        force: true, 
        columns: ['SchoolsContact']
      });
    }
  }, [AllSchools, props.data, props.node, props.api, getLabel]);

  const getOptions = useCallback(() => {
    const options = AllSchools?.map((val) => ({
      value: val.SchoolName,
      label: val.SchoolName?.concat(`-${val.City ? val.City : 'ללא עיר'}`),
    }));
    return options;
  }, [AllSchools]);

  const onChange = (newValue: OnChangeValue<any, false>, actionMeta: ActionMeta<any>) => {
    if (newValue.value !== props.data.SchoolName || newValue.label !== getLabel(props.data.SchoolName, props.data.CityName)) {
      
      const school: School = AllSchools.find((val) => newValue.value === val.SchoolName && newValue.label===getLabel(val.SchoolName,val.City));
      
      if (school) {
        // === כאן בוצע התיקון: CityName -> City ===
        props.node.setDataValue("City", school.City);
        
        // הסרתי את עדכון ה-District כי הוא לא קיים בטבלה ויגרום לקריסה
        // props.node.setDataValue("District", ""); 

        props.node.setDataValue("SchoolName", school.SchoolName);
        props.node.setDataValue("Schoolid", school.Schoolid);
        props.node.setDataValue("EducationStage", school.EducationStage);
        
        // אופציונלי: עדכון איש קשר אם קיים אצל בית הספר
        if (school.ContactName) {
            props.node.setDataValue("SchoolsContact", school.ContactName);
        }

        props.api.refreshCells({
          force: true, 
          columns: ['SchoolsContact'] // מרענן גם את עמודת אנשי הקשר
        });
        // רענון השורה הנוכחית כדי לראות את השינויים בעיר ובמזהה
        props.api.refreshCells({ rowNodes: [props.node] });
      }
    }
  };

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
  };

  // Automatically open the menu when the component is focused
  useEffect(() => {
    if (props.api && props.api.getFocusedCell()) {
      const focusedCell = props.api.getFocusedCell();
      if (focusedCell.rowIndex === props.rowIndex && focusedCell.column.getColId() === props.column.getColId()) {
        selectRef.current?.onMenuOpen(); // Open the menu when the cell is focused
      }
    }
  }, [props.api, props.rowIndex, props.column]);

  return (
    <Select
      className="basic-single"
      classNamePrefix="select"
      isRtl={true}
      options={getOptions()}
      styles={customStyles}
      defaultValue={{ value: School, label: SchoolLabel }}
      controlShouldRenderValue={true}
      isSearchable={true}
      onChange={onChange}
      onMenuOpen={() => selectRef.current?.focus()} // Ensure the menu is focused when opened
      ref={selectRef} // Attach the ref to the Select component
    />
  );
});