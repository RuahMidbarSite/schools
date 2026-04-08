import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Trash2 } from 'lucide-react'; // או כל אייקון אחר, אם אין לך lucide תשתמש בטקסט רגיל

export const MultiSelectCellEditor = forwardRef((props: any, ref) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const options = props.values || [];

  useEffect(() => {
    if (props.value) {
      const val = Array.isArray(props.value) 
        ? props.value 
        : (typeof props.value === 'string' ? props.value.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedOptions(val);
    }
  }, [props.value]);

  useImperativeHandle(ref, () => ({
    getValue() {
      return selectedOptions.join(', ');
    },
    isPopup() {
      return true;
    }
  }));

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(o => o !== option);
      }
      return [...prev, option];
    });
  };

  // === הוספת פונקציית ניקוי ===
  const clearAll = () => {
    setSelectedOptions([]);
  };

  return (
    <div 
      className="bg-white border p-3 shadow-lg rounded flex flex-col gap-2" 
      style={{ minWidth: '200px', maxHeight: '300px' }}
      // מניעת סגירה בלחיצה בתוך הרכיב
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* כותרת וכפתור ניקוי */}
      <div className="flex justify-between items-center border-b pb-2 mb-1">
        <button 
            onClick={clearAll}
            className="text-red-500 text-xs hover:bg-red-50 px-2 py-1 rounded transition flex items-center gap-1"
        >
            נקה הכל 🗑️
        </button>
        <h6 className="text-gray-500 text-xs font-bold m-0">בחר ימים:</h6>
      </div>

      {/* רשימת האפשרויות */}
      <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
        {options.map((opt: string) => (
            <div 
            key={opt} 
            className="flex items-center justify-end gap-2 mb-2 hover:bg-gray-50 p-2 rounded cursor-pointer transition" 
            onClick={() => toggleOption(opt)}
            >
            <span className="text-sm text-gray-700 select-none">{opt}</span>
            <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                checked={selectedOptions.includes(opt)}
                readOnly
                />
            </div>
        ))}
      </div>
    </div>
  );
});

MultiSelectCellEditor.displayName = 'MultiSelectCellEditor';