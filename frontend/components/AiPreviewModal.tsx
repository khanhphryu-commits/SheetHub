import React, { useState, useEffect } from 'react';
import { Column, RecordData, Table, ColType } from '../types';
import { MOCK_USERS } from '../constants';
import { getDisplayText } from './CellEditor';

interface AiPreviewModalProps {
  initialData: RecordData;
  columns: Column[];
  tables: Table[];
  onConfirm: (data: RecordData) => void;
  onClose: () => void;
}

export const AiPreviewModal: React.FC<AiPreviewModalProps> = ({ initialData, columns, tables, onConfirm, onClose }) => {
  const [formData, setFormData] = useState<RecordData>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (colId: string, value: any) => {
    setFormData(prev => ({ ...prev, [colId]: value }));
  };

  const renderInput = (col: Column) => {
    const value = formData[col.id] || '';
    const commonClasses = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";

    if (col.type === ColType.SELECT) {
      return (
        <select value={value} onChange={(e) => handleChange(col.id, e.target.value)} className={commonClasses}>
          <option value="">-- Chọn --</option>
          {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (col.type === ColType.USER) {
      return (
        <select value={value} onChange={(e) => handleChange(col.id, e.target.value)} className={commonClasses}>
          <option value="">-- Chọn nhân sự --</option>
          {MOCK_USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      );
    }

    if (col.type === ColType.LINK && col.linkedTableId) {
      const linkedTable = tables.find(t => t.id === col.linkedTableId);
      const targetColId = col.linkedColumnId || linkedTable?.columns[0]?.id;

      return (
        <select value={value} onChange={(e) => handleChange(col.id, e.target.value)} className={commonClasses}>
          <option value="">-- Chọn bản ghi liên kết --</option>
          {linkedTable?.records.map(record => {
            const targetColDef = linkedTable.columns.find(c => c.id === targetColId);
            const optionText = targetColDef ? getDisplayText(targetColDef, record[targetColId as string], tables) : record.id;
            return <option key={record.id} value={record.id}>{optionText}</option>;
          })}
        </select>
      );
    }

    if (col.type === ColType.IMAGE) {
      return (
        <div className="flex flex-col gap-2">
          <input 
            type="text" 
            value={value} 
            onChange={(e) => handleChange(col.id, e.target.value)} 
            className={commonClasses} 
            placeholder="URL ảnh..." 
          />
          {value && (
            <div className="w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50">
              <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={col.type === ColType.NUMBER ? 'number' : col.type === ColType.DATE ? 'date' : 'text'}
        value={value}
        onChange={(e) => {
          let val: any = e.target.value;
          if (col.type === ColType.NUMBER && val !== '') val = Number(val);
          handleChange(col.id, val);
        }}
        className={commonClasses}
        placeholder={`Nhập ${col.name.toLowerCase()}...`}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
          <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Xác nhận dữ liệu trích xuất
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-gray-600 mb-2">Vui lòng kiểm tra và chỉnh sửa lại dữ liệu do AI trích xuất trước khi lưu vào bảng.</p>
          {columns.map(col => (
            <div key={col.id} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">{col.name}</label>
              {renderInput(col)}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Hủy bỏ</button>
          <button 
            onClick={() => onConfirm(formData)} 
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm transition-colors"
          >
            Lưu vào bảng
          </button>
        </div>
      </div>
    </div>
  );
};
