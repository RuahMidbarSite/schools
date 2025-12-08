import React from 'react';


interface AgGridDropdownProps {
  value: string;
  options: string[];
  onValueChange: (newValue: string) => void;
}

const AgGridDropdown: React.FC<AgGridDropdownProps> = ({ value, options, onValueChange }) => {
  return (
    <select
      className="ag-cell-value"
      style={{ width: '100%' }}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default AgGridDropdown;