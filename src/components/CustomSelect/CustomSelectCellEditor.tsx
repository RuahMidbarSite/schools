import { ThemeContext } from '@/context/Theme/Theme';
import { ICellEditorParams } from 'ag-grid-community';
import React, { useState, useEffect, forwardRef, useImperativeHandle, useContext, useRef } from 'react';
import Select, { ActionMeta, components, OnChangeValue } from 'react-select';

// since school name is not unique
interface CustomSelectCellEditorProps extends ICellEditorParams {
  values: string[];
  cities?: string[] // this only exists in bigcontacts for now.
  ids?: number[] // this only exists in bigcontacts
};



const CustomSelectCellEditor = forwardRef(({ values, value, cities, ids, ...props }: CustomSelectCellEditorProps, ref) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const options = values.map((value, index) => ({ value: ids ? ids[index] : value, label: cities ? `${value.concat(`-${cities[index]}`)}` : value }));
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
    menuList: (provided) => ({
      ...provided,
      padding: 0,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#e0e0e0" : currentTheme.optionBackground,
      color: state.isSelected ? "#000" : currentTheme.optionTextColor, textAlign: "right",
    }),
    container: (provided) => ({
      ...provided,
      minHeight: "100%",
      minWidth: "100%",
      height: "100%",
      width: "100%",
    }),
    input: (provided) => ({
      ...provided,
      color: currentTheme.controlTextColor, // Text color when typing inside
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
  useEffect(() => {
    let initialValue
    if (value && ids && values) {
      initialValue = value ? { label: `${values[value-1].concat(`-${cities[value-1]}`)}` , value: value } : null;
    } else {
      initialValue = value ? { label: value, value: value } : null;
    }

    setSelectedOption(initialValue);
  }, [cities, ids, value, values]);

  const handleChange = async (newValue: OnChangeValue<any, false>,
    actionMeta: ActionMeta<any>) => {
    setSelectedOption(newValue);
    props.node.setDataValue(props.colDef.field as string, newValue.value);
    props.stopEditing();
  };

  return (
    <Select
      value={selectedOption}
      onChange={handleChange}
      menuPortalTarget={document.body}
      styles={customStyles}
      options={options}
      autoFocus
      openMenuOnFocus
      isSearchable
    />
  );
});

CustomSelectCellEditor.displayName = 'CustomSelectCellEditor';
export default CustomSelectCellEditor;
