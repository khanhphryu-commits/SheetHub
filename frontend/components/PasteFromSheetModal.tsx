import React, { useState } from 'react';
import { Column, RecordData, Table, ColType } from '../types';

interface PasteFromSheetModalProps {
  activeTable: Table;
  onImport: (headers: string[], rows: string[][]) => void;
  onClose: () => void;
}

export const PasteFromSheetModal: React.FC<PasteFromSheetModalProps> = ({ activeTable, onImport, onClose }) => {
  const [rawText, setRawText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);

  const processText = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedHeaders([]);
      setParsedRows([]);
      return;
    }

    // Basic TSV parsing (Tab-Separated Values) which is standard for Sheets/Excel copy
    const lines = text.trim().split(/\r?\n/);
    if (lines.length > 0) {
      const headers = lines[0].split('\t');
      const rows = lines.slice(1).map(line => line.split('\t'));
      setParsedHeaders(headers);
      setParsedRows(rows);
    }
  };

  const handleConfirm = () => {
    if (parsedHeaders.length > 0) {
      onImport(parsedHeaders, parsedRows);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Dán dữ liệu từ Google Sheet / Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Copy vùng dữ liệu trên Google Sheet (bao gồm cả dòng tiêu đề) và nhấn <strong>Ctrl+V</strong> (hoặc Cmd+V) vào ô bên dưới.
            Hệ thống sẽ tự động nhận diện và tạo các cột tương ứng nếu chưa có.
          </p>
          
          <textarea
            className="w-full h-40 border border-gray-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Dán dữ liệu vào đây..."
            value={rawText}
            onChange={(e) => processText(e.target.value)}
            autoFocus
          />

          {parsedHeaders.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Xem trước dữ liệu ({parsedRows.length} dòng)</h3>
              <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-64">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      {parsedHeaders.map((header, idx) => {
                        const isExisting = activeTable.columns.some(c => c.name.toLowerCase() === header.toLowerCase());
                        return (
                          <th key={idx} className="px-4 py-2 font-medium text-gray-700">
                            {header}
                            {!isExisting && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Cột mới</span>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50">
                        {parsedHeaders.map((_, cIdx) => (
                          <td key={cIdx} className="px-4 py-2 text-gray-600 truncate max-w-[200px]">
                            {row[cIdx] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedRows.length > 5 && (
                      <tr>
                        <td colSpan={parsedHeaders.length} className="px-4 py-2 text-center text-gray-400 italic text-xs">
                          ... và {parsedRows.length - 5} dòng khác
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Hủy</button>
          <button 
            onClick={handleConfirm} 
            disabled={parsedHeaders.length === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Xác nhận & Nhập
          </button>
        </div>
      </div>
    </div>
  );
};
