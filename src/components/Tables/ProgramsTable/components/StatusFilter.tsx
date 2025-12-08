import { StatusContext } from '@/context/StatusContext';
import { YearContext } from '@/context/YearContext';
import React, { useState, useEffect, forwardRef, useImperativeHandle, useContext, useRef } from 'react';

export interface FilterTypeStatus {
  isFilterActive: () => boolean;
  doesFilterPass: (params: any) => boolean;
  getModel: () => { values: string[] } | null;
  setModel: (model: { values: string[] } | null) => void;
  setDefaultStatus: (status: string) => void;
  refresh: () => void;
}
export const StatusFilter = forwardRef<FilterTypeStatus, any>((props: any, ref) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const defaultStatus = useRef(undefined)

  useEffect(() => {
    const uniqueValues = getUniqueValuesFromGridData(props);
    setFilterValues(uniqueValues);

    const onCellValueChanged = () => {
      const updatedValues = getUniqueValuesFromGridData(props);
      setFilterValues(updatedValues);
    };

    props.api.addEventListener('cellValueChanged', onCellValueChanged);

    return () => {
      props.api.removeEventListener('cellValueChanged', onCellValueChanged);
    };
  }, [props]);



  useEffect(() => {
    props.filterChangedCallback();
  }, [selectedValues, props]);

  const onSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAllChecked(checked);

    if (checked) {
      setSelectedValues(filterValues);
    } else {
      setSelectedValues([]);
    }
  };

  const onValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const newSelectedValues = event.target.checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);

    setSelectedValues(newSelectedValues);

    // Uncheck "Select All" if any checkbox is deselected
    if (!event.target.checked && selectAllChecked) {
      setSelectAllChecked(false);
    }
  };

  useImperativeHandle(ref, (): FilterTypeStatus => ({
    isFilterActive() {
      return selectedValues.length > 0;
    },
    doesFilterPass(params: any) {
      const value = params.data[props.colDef.field];
      let formattedValue;

      // Convert the cell value to match the filter values
      if (typeof value === 'boolean') {
        formattedValue = value ? "משובץ" : "לא משובץ";
      } else {
        formattedValue = formatValue(params, props);
      }

      return selectedValues.includes(formattedValue);
    },
    getModel() {
      return !selectedValues.length ? null : { values: selectedValues };
    },
    setModel(model: any) {
      setSelectedValues(model ? model.values : []);
      setSelectAllChecked(model && model.values && model.values.length === filterValues.length);
    },
    setDefaultStatus(status: string) {
      defaultStatus.current = status
    },
    refresh() {
      const uniqueValues = getUniqueValuesFromGridData(props);
      setFilterValues(uniqueValues);
    }
  }));

  const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredValues = filterValues.filter(value =>
    value != null && value.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const getUniqueValuesFromGridData = (props: any) => {
    const uniqueValues = new Set<string>();
    props.api.forEachNode((node: any) => {
      const formattedValue = formatValue({ data: node.data }, props);

      // Convert true/false to the desired strings
      if (formattedValue === true) {
        uniqueValues.add("נציג");
      } else if (formattedValue === false) {
        uniqueValues.add("לא נציג");
      } else {
        uniqueValues.add(formattedValue);
      }
    });
    let array = Array.from(uniqueValues)
    if (defaultStatus.current && array && !array.includes(defaultStatus.current)) {
      array = [defaultStatus.current, ...array]
    }
    return array;
  };

  const formatValue = (params: any, props: any) => {
    let value = params.data[props.colDef.field];

    // Check for boolean values and return custom strings
    if (typeof value === 'boolean') {
      return value ? "נציג" : "לא נציג";
    }

    if (props.colDef && props.colDef.valueFormatter) {
      return props.colDef.valueFormatter({ ...props, value: value });
    }

    return value;
  };

  return (
    <div className="p-2 bg-gray-800 shadow-md rounded-md">
      <input
        type="text"
        placeholder="חיפוש"
        className="w-full p-2 mb-2 text-sm text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        value={searchTerm}
        onChange={onSearchChange}
      />

      <div className="flex items-center mb-2">
        <label className="flex items-center space-x-2 text-white text-lg">
          <input
            type="checkbox"
            onChange={onSelectAllChange}
            checked={selectAllChecked}
            className="form-checkbox h-6 w-6 text-blue-600 ml-1"
          />
          <span>בחר הכל</span>
        </label>
      </div>

      {filteredValues.map((value) => (
        <div key={value} className="flex items-center mb-1">
          <label className="flex items-center space-x-2 text-white text-lg">
            <input
              type="checkbox"
              value={value}
              onChange={onValueChange}
              checked={selectedValues.includes(value)}
              className="form-checkbox h-6 w-6 text-blue-600 ml-1"
            />
            <span>{value}</span>
          </label>
        </div>
      ))}
    </div>
  );
});



StatusFilter.displayName = "StatusFilter";
export default StatusFilter;