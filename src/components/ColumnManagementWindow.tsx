import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form } from 'react-bootstrap';

export const ColumnManagementWindow = ({ show, onHide, columnDefs, gridApi, colState, setColState }) => {
  const [columnVisibility, setColumnVisibility] = useState({});

  useEffect(() => {
    const initialVisibility = {};
    columnDefs?.forEach(colDef => {
      const colStateItem = colState.find(col => col.colId === colDef.field);
      initialVisibility[colDef.field] = colStateItem ? !colStateItem.hide : true;
    });
    setColumnVisibility(initialVisibility);
  }, [columnDefs, colState]);

  const handleCheckboxChange = useCallback((field) => {
    setColumnVisibility(prevState => {
      const newState = { ...prevState, [field]: !prevState[field] };
      gridApi.setColumnVisible(field, newState[field]);

      const colStateModified = colState.map(col =>
        col.colId === field ? { ...col, hide: !newState[field] } : col
      );
      setColState(colStateModified);

      return newState;
    });
  }, [gridApi, colState, setColState]);

  return (
    <Modal show={show} onHide={onHide} dialogClassName="flex items-center justify-center min-h-screen">
      <Modal.Header closeButton>
        <Modal.Title className="w-100 text-center">ניהול עמודות</Modal.Title>
      </Modal.Header>
      <Modal.Body key={1} className="text-right">
        {columnDefs?.map((colDef, index) => (
          !colDef.lockVisible && !["Assigned_guide", "ProgramName", "ProgramLink"].includes(colDef.field) && (
            <div key={index} className="flex items-center justify-end mb-2">
              <label className="text-lg text-right mr-4">
                {colDef.headerName ? colDef.headerName : colDef.field}
              </label>
              <input
                type="checkbox"
                id={colDef.field}
                checked={columnVisibility[colDef.field]}
                onChange={() => handleCheckboxChange(colDef.field)}
                className="form-checkbox h-6 w-6 text-blue-600"
              />
            </div>
          )
        ))}
      </Modal.Body>
    </Modal>
  );
};

export default ColumnManagementWindow;