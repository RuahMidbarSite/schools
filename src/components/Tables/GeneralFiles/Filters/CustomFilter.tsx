import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';

export const CustomFilter = forwardRef((props: any, ref) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const getUniqueValuesFromGridData = useCallback((props: any) => {
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
    return Array.from(uniqueValues);
  }, []);

  const formatValue = useCallback((params: any, props: any) => {
    let value = params.data[props.colDef.field];

    // Check for boolean values and return custom strings
    if (props.colDef.field && props.colDef.field === "isAssigned") {
      return value ? "משובץ" : "לא משובץ"
    }

    if (typeof value === 'boolean') {
      return value ? "נציג" : "לא נציג";
    }

    if (props.colDef && props.colDef.valueFormatter) {
      return props.colDef.valueFormatter({ ...props, value: value });
    }

    return value;
  }, []);



  useEffect(() => {
    const uniqueValues = getUniqueValuesFromGridData(props).filter((res)=>res!==null);

    setFilterValues(uniqueValues);

    const onCellValueChanged = () => {
      const updatedValues = getUniqueValuesFromGridData(props);
      setFilterValues(updatedValues);
    };

    props.api.addEventListener('cellValueChanged', onCellValueChanged);

    return () => {
      props.api.removeEventListener('cellValueChanged', onCellValueChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    props.filterChangedCallback();
  }, [selectedValues, props]);

  const onSelectAllChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAllChecked(checked);

    if (checked) {
      setSelectedValues(filterValues);
    } else {
      setSelectedValues([]);
    }
  }, [filterValues]);

  const onValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = String(event.target.value);
    const newSelectedValues = event.target.checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);

   console.log(newSelectedValues)

    setSelectedValues([...newSelectedValues]);

    // Uncheck "Select All" if any checkbox is deselected
    if (!event.target.checked && selectAllChecked) {
      setSelectAllChecked(false);
    }
  }, [selectAllChecked, selectedValues]);

  useImperativeHandle(ref, () => ({
    isFilterActive() {
      return selectedValues.length > 0;
    },
    doesFilterPass(params: any) {
      const value = params.data[props.colDef.field];
      let formattedValue;

      // Convert the cell value to match the filter values
      if (props.colDef.field && props.colDef.field === "isAssigned") {
        formattedValue = value ? "משובץ" : "לא משובץ";
      } else if (typeof value === 'boolean') {
        formattedValue = value ? "נציג" : "לא נציג";
      } else {
        formattedValue = formatValue(params, props);
      }

      if(formattedValue===null) {return false}


      return selectedValues.includes(String(formattedValue));
    },
    getModel() {
      return !selectedValues.length ? null : { values: selectedValues };
    },
    setModel(model: any) {
      setSelectedValues(model ? model.values : []);
      setSelectAllChecked(model && model.values && model.values.length === filterValues.length);
    }
  }));

  const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    
    setSearchTerm(String(event.target.value));
  }, []);

  const filteredValues = useMemo(() => filterValues.filter(value =>  {
      
         if (typeof value!=='undefined' &&  value!==null && typeof value==='string') {
            return String(value)?.toLowerCase()?.includes(searchTerm.toLowerCase())
         }
          if(searchTerm ==='') {
          return true
       }
       
        return true
  }
  ), [filterValues, searchTerm]);

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
              checked={selectedValues.includes(String(value))}
              className="form-checkbox h-6 w-6 text-blue-600 ml-1"
            />
            <span>{value}</span>
          </label>
        </div>
      ))}
    </div>
  );
});


CustomFilter.displayName = "CustomFilter";
export default CustomFilter;