import React, { useState, useEffect } from 'react';
import { Column, ColType, Table } from '../types';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

interface ColumnManagerProps {
  activeTable: Table;
  allTables: Table[];
  onUpdateColumns: (columns: Column[]) => void;
  onClose: () => void;
}

export const ColumnManager: React.FC<ColumnManagerProps> = ({ activeTable, allTables, onUpdateColumns, onClose }) => {
  const [localColumns, setLocalColumns] = useState<Column[]>([...activeTable.columns]);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColType>(ColType.TEXT);
  const [newColOptions, setNewColOptions] = useState('');
  const [newColLinkedTable, setNewColLinkedTable] = useState('');
  const [newColLinkedColumn, setNewColLinkedColumn] = useState('');

  // Reset column selection when table changes
  useEffect(() => {
    setNewColLinkedColumn('');
  }, [newColLinkedTable]);

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    
    const newCol: Column = {
      id: `col_${Date.now()}`,
      name: newColName.trim(),
      type: newColType,
    };

    if (newColType === ColType.SELECT && newColOptions.trim()) {
      newCol.options = newColOptions.split(',').map(s => s.trim()).filter(Boolean);
    } else if (newColType === ColType.LINK && newColLinkedTable) {
      newCol.linkedTableId = newColLinkedTable;
      const targetTable = allTables.find(t => t.id === newColLinkedTable);
      
      if (newColLinkedColumn) {
        newCol.linkedColumnId = newColLinkedColumn;
      } else if (targetTable && targetTable.columns.length > 0) {
        // Default to first column if not explicitly selected
        newCol.linkedColumnId = targetTable.columns[0].id;
      }
    }

    setLocalColumns([...localColumns, newCol]);
    setNewColName('');
    setNewColOptions('');
    setNewColLinkedTable('');
    setNewColLinkedColumn('');
  };

  const handleRemoveColumn = (id: string) => {
    setLocalColumns(localColumns.filter(c => c.id !== id));
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...localColumns];
    if (direction === 'up' && index > 0) {
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
    } else if (direction === 'down' && index < newColumns.length - 1) {
      [newColumns[index + 1], newColumns[index]] = [newColumns[index], newColumns[index + 1]];
    }
    setLocalColumns(newColumns);
  };

  const handleSave = () => {
    onUpdateColumns(localColumns);
    onClose();
  };

  const availableTablesToLink = allTables.filter(t => t.id !== activeTable.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Thuộc tính: {activeTable.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {/* Existing Columns */}
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Các cột hiện tại</h3>
            {localColumns.map((col, index) => (
              <div key={col.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                <div>
                  <span className="font-medium text-sm text-gray-700">{col.name}</span>
                  <span className="ml-2 text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded uppercase">{col.type}</span>
                  {col.type === ColType.LINK && col.linkedTableId && (
                    <span className="ml-2 text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      &rarr; {allTables.find(t => t.id === col.linkedTableId)?.name || 'Unknown'}
                      {col.linkedColumnId && ` (${allTables.find(t => t.id === col.linkedTableId)?.columns.find(c => c.id === col.linkedColumnId)?.name})`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => moveColumn(index, 'up')} 
                    disabled={index === 0} 
                    className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                    title="Di chuyển lên"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveColumn(index, 'down')} 
                    disabled={index === localColumns.length - 1} 
                    className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                    title="Di chuyển xuống"
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button 
                    onClick={() => handleRemoveColumn(col.id)} 
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                    title="Xóa cột"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {localColumns.length === 0 && <p className="text-sm text-gray-400 italic">Chưa có cột nào.</p>}
          </div>

          {/* Add New Column Form */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-3">Thêm cột mới</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tên cột</label>
                <input 
                  type="text" 
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="VD: Ngày bảo trì, Ghi chú..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại dữ liệu</label>
                <select 
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as ColType)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value={ColType.TEXT}>Văn bản (Text)</option>
                  <option value={ColType.NUMBER}>Số (Number)</option>
                  <option value={ColType.DATE}>Ngày tháng (Date)</option>
                  <option value={ColType.SELECT}>Lựa chọn (Dropdown)</option>
                  <option value={ColType.USER}>Liên kết nhân sự (User Link)</option>
                  <option value={ColType.LINK}>Liên kết bảng khác (Relation)</option>
                  <option value={ColType.IMAGE}>Hình ảnh (Image)</option>
                </select>
              </div>
              
              {newColType === ColType.SELECT && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Các lựa chọn (cách nhau bằng dấu phẩy)</label>
                  <input 
                    type="text" 
                    value={newColOptions}
                    onChange={(e) => setNewColOptions(e.target.value)}
                    placeholder="VD: Mới, Cũ, Hỏng"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {newColType === ColType.LINK && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Chọn bảng để liên kết</label>
                    <select 
                      value={newColLinkedTable}
                      onChange={(e) => setNewColLinkedTable(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- Chọn bảng --</option>
                      {availableTablesToLink.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  {newColLinkedTable && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Chọn trường hiển thị (Link sâu)</label>
                      <select 
                        value={newColLinkedColumn}
                        onChange={(e) => setNewColLinkedColumn(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">-- Mặc định (Cột đầu tiên) --</option>
                        {allTables.find(t => t.id === newColLinkedTable)?.columns.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <button 
                onClick={handleAddColumn}
                disabled={!newColName.trim() || (newColType === ColType.LINK && !newColLinkedTable)}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Thêm vào danh sách
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Hủy</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm transition-colors">Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
};
