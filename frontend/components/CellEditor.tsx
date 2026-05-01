import React, { useState, useEffect, useRef } from 'react';
import { Column, ColType, Table } from '../types';
import { MOCK_USERS } from '../constants';
import { LinkIcon, PhotoIcon } from './Icons';

interface CellEditorProps {
  column: Column;
  value: any;
  tables: Table[];
  onChange: (newValue: any) => void;
}

// Recursive helper to resolve deep link text
export const getDisplayText = (colDef: Column, val: any, allTables: Table[], depth = 0): string => {
  if (val == null || val === '') return 'Trống';
  if (depth > 5) return '...'; // Prevent infinite loops in circular references
  
  if (colDef.type === ColType.NUMBER) return new Intl.NumberFormat('vi-VN').format(val);
  if (colDef.type === ColType.IMAGE) return '[Hình ảnh]';
  
  if (colDef.type === ColType.USER) {
    const user = MOCK_USERS.find(u => u.id === val);
    return user ? user.name : String(val);
  }
  
  if (colDef.type === ColType.LINK && colDef.linkedTableId) {
    const linkedTable = allTables.find(t => t.id === colDef.linkedTableId);
    if (linkedTable) {
      const targetColId = colDef.linkedColumnId || linkedTable.columns[0]?.id;
      const targetColDef = linkedTable.columns.find(c => c.id === targetColId);
      const linkedRecord = linkedTable.records.find(r => r.id === val);
      
      if (linkedRecord && targetColDef) {
        return getDisplayText(targetColDef, linkedRecord[targetColId], allTables, depth + 1);
      }
    }
    return 'Lỗi liên kết';
  }
  
  return String(val);
};

export const CellEditor: React.FC<CellEditorProps> = ({ column, value, tables, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      let finalValue = tempValue;
      if (column.type === ColType.NUMBER && tempValue !== '') {
        finalValue = Number(tempValue);
      }
      onChange(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value || '');
    }
  };

  // Display logic when NOT editing
  if (!isEditing) {
    let displayContent;
    
    if (value == null || value === '') {
      displayContent = <span className="text-gray-400 italic text-sm">Trống</span>;
    } else if (column.type === ColType.IMAGE) {
      displayContent = (
        <div className="w-8 h-8 rounded overflow-hidden border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center">
          <img 
            src={value} 
            alt="Cell content" 
            className="w-full h-full object-cover" 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
          />
        </div>
      );
    } else if (column.type === ColType.LINK && column.linkedTableId) {
      const text = getDisplayText(column, value, tables);
      displayContent = (
        <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 w-fit max-w-full overflow-hidden">
          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-sm font-medium truncate">{text}</span>
        </div>
      );
    } else if (column.type === ColType.USER) {
      const user = MOCK_USERS.find(u => u.id === value || u.name.toLowerCase().includes(String(value).toLowerCase()));
      if (user) {
        displayContent = (
          <div className="flex items-center gap-2">
            <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full shrink-0" />
            <span className="text-sm font-medium truncate">{user.name}</span>
          </div>
        );
      } else {
         displayContent = String(value);
      }
    } else if (column.type === ColType.SELECT) {
       displayContent = (
         <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100 whitespace-nowrap">
           {value}
         </span>
       )
    } else if (column.type === ColType.NUMBER) {
      displayContent = new Intl.NumberFormat('vi-VN').format(value);
    } else {
      displayContent = <span className="truncate block">{String(value)}</span>;
    }

    return (
      <div 
        className="min-h-[2rem] flex items-center cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded transition-colors overflow-hidden"
        onClick={() => setIsEditing(true)}
      >
        {displayContent}
      </div>
    );
  }

  // Edit logic
  const commonClasses = "w-full border-2 border-blue-500 rounded px-2 py-1 text-sm focus:outline-none shadow-sm";

  if (column.type === ColType.SELECT) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={commonClasses}
      >
        <option value="">-- Chọn --</option>
        {column.options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (column.type === ColType.USER) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={commonClasses}
      >
        <option value="">-- Chọn nhân sự --</option>
        {MOCK_USERS.map(user => (
          <option key={user.id} value={user.id}>{user.name}</option>
        ))}
      </select>
    );
  }

  if (column.type === ColType.LINK && column.linkedTableId) {
    const linkedTable = tables.find(t => t.id === column.linkedTableId);
    const targetColId = column.linkedColumnId || linkedTable?.columns[0]?.id;

    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={commonClasses}
      >
        <option value="">-- Chọn bản ghi liên kết --</option>
        {linkedTable?.records.map(record => {
          const targetColDef = linkedTable.columns.find(c => c.id === targetColId);
          const optionText = targetColDef ? getDisplayText(targetColDef, record[targetColId as string], tables) : record.id;
          return (
            <option key={record.id} value={record.id}>
              {optionText}
            </option>
          );
        })}
      </select>
    );
  }

  if (column.type === ColType.IMAGE) {
    return (
      <div className="flex items-center gap-1 w-full">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={commonClasses}
          placeholder="URL ảnh..."
        />
        <label 
          className="cursor-pointer p-1.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300 text-gray-500 shrink-0"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur on input when clicking label
          title="Tải ảnh lên"
        >
          <PhotoIcon className="w-4 h-4" />
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = reader.result as string;
                  setTempValue(base64);
                  onChange(base64); // Auto save on file pick
                  setIsEditing(false);
                };
                reader.readAsDataURL(file);
              }
            }} 
          />
        </label>
      </div>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={column.type === ColType.NUMBER ? 'number' : column.type === ColType.DATE ? 'date' : 'text'}
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={commonClasses}
      placeholder={`Nhập ${column.name.toLowerCase()}...`}
    />
  );
};
