import { StatusContext } from '@/context/StatusContext';
import { YearContext } from '@/context/YearContext';
import React, { useState, useEffect, forwardRef, useImperativeHandle, useContext, useRef, useCallback, useMemo } from 'react';

export interface FilterType {
  isFilterActive: () => boolean;
  doesFilterPass: (params: any) => boolean;
  getModel: () => { values: string[] } | null;
  setModel: (model: { values: string[] } | null) => void;
  setDefaultYear: (year: string) => void;
  refresh: () => void;
}

export const YearFilter = forwardRef<FilterType, any>((props: any, ref) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const defaultYear = useRef<string | undefined>(undefined);

  const filteredValues = useMemo(() => {
    // הגנה מפני מערך ריק או לא מוגדר
    if (!filterValues) return [];
    return filterValues.filter(value =>
      value != null && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filterValues, searchTerm]);

  const formatValue = useCallback((params: any, props: any) => {
    let value = params.data[props.colDef.field];

    if (typeof value === 'boolean') {
      return value ? "נציג" : "לא נציג";
    }

    if (props.colDef && props.colDef.valueFormatter) {
      return props.colDef.valueFormatter({ ...props, value: value });
    }

    return value;
  }, []);

  const getUniqueValuesFromGridData = useCallback((props: any) => {
    const uniqueValues = new Set<string>();
    if (props.api) {
      props.api.forEachNode((node: any) => {
        const formattedValue = formatValue({ data: node.data }, props);

        if (formattedValue === true) {
          uniqueValues.add("נציג");
        } else if (formattedValue === false) {
          uniqueValues.add("לא נציג");
        } else if (formattedValue != null) {
          uniqueValues.add(formattedValue);
        }
      });
    }

   // בקובץ YearFilter.tsx - סביב שורה 67

    let array = Array.from(uniqueValues);
    
    // הוספת המיון כאן (זה מה שקובע את הסדר בתפריט)
    array.sort((a: string, b: string) => (a > b ? -1 : 1));

    // וידוא שהשנה המוגדרת כברירת מחדל תופיע ברשימה
    if (defaultYear.current && !array.includes(defaultYear.current)) {
      array = [defaultYear.current, ...array];
    }
    return array;
  }, [formatValue]);

  useEffect(() => {
    const uniqueValues = getUniqueValuesFromGridData(props);
    setFilterValues(uniqueValues);

    const onCellValueChanged = () => {
      const updatedValues = getUniqueValuesFromGridData(props);
      setFilterValues(updatedValues);
    };

    props.api.addEventListener('cellValueChanged', onCellValueChanged);

    return () => {
      if (props.api) {
        props.api.removeEventListener('cellValueChanged', onCellValueChanged);
      }
    };
  }, [getUniqueValuesFromGridData, props]);

  useEffect(() => {
    props.filterChangedCallback();
  }, [selectedValues, props]);

  const onSelectAllChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAllChecked(checked);
    setSelectedValues(checked ? filterValues : []);
  }, [filterValues]);

  const onValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const newSelectedValues = event.target.checked
      ? [...(selectedValues || []), value]
      : (selectedValues || []).filter((v) => v !== value);

    setSelectedValues(newSelectedValues);

    if (!event.target.checked && selectAllChecked) {
      setSelectAllChecked(false);
    }
  }, [selectAllChecked, selectedValues]);

  useImperativeHandle(ref, (): FilterType => ({
    isFilterActive() {
      return (selectedValues?.length || 0) > 0;
    },
    doesFilterPass(params: any) {
      const value = params.data[props.colDef.field];
      let formattedValue;

      if (typeof value === 'boolean') {
        formattedValue = value ? "משובץ" : "לא משובץ";
      } else {
        formattedValue = formatValue(params, props);
      }

      // תיקון קריטי: הגנה מפני selectedValues לא מוגדר
      return selectedValues?.includes(formattedValue) || false;
    },
    getModel() {
      return !(selectedValues?.length) ? null : { values: selectedValues };
    },
    setModel(model: any) {
      setSelectedValues(model ? model.values : []);
      setSelectAllChecked(model && model.values && model.values.length === filterValues.length);
    },
    setDefaultYear(year: string) {
      defaultYear.current = year;
    },
    refresh() {
      const uniqueValues = getUniqueValuesFromGridData(props);
      setFilterValues(uniqueValues);
    }
  }));

  const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

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
        <label className="flex items-center space-x-2 text-white text-lg cursor-pointer">
          <input
            type="checkbox"
            onChange={onSelectAllChange}
            checked={selectAllChecked}
            className="form-checkbox h-6 w-6 text-blue-600 ml-1"
          />
          <span>בחר הכל</span>
        </label>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {filteredValues.map((value) => (
          <div key={value} className="flex items-center mb-1">
            <label className="flex items-center space-x-2 text-white text-lg cursor-pointer">
              <input
                type="checkbox"
                value={value}
                onChange={onValueChange}
                // תיקון: הגנה בשורה 175
                checked={selectedValues?.includes(value) || false}
                className="form-checkbox h-6 w-6 text-blue-600 ml-1"
              />
              <span>{value}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
});

YearFilter.displayName = "CustomFilter";
export default YearFilter;