import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Column, RecordData, Table } from '../types';

interface ImportModalProps {
  activeTable: Table;
  onImport: (newRecords: RecordData[]) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ activeTable, onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // importedHeader -> targetColumnId
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON, treating first row as headers
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (json.length > 0) {
          const headers = Object.keys(json[0]);
          // Filter out the internal _ID column from the mapping UI
          setParsedHeaders(headers.filter(h => h !== '_ID'));
          setParsedData(json);
          
          // Auto-map based on exact or lowercase match
          const initialMapping: Record<string, string> = {};
          headers.forEach(header => {
            if (header === '_ID') return; // Skip internal ID
            const matchedCol = activeTable.columns.find(
              c => c.name.toLowerCase() === header.toLowerCase()
            );
            if (matchedCol) {
              initialMapping[header] = matchedCol.id;
            } else {
              initialMapping[header] = ''; // Unmapped
            }
          });
          setMapping(initialMapping);
        } else {
          setError("File không có dữ liệu hoặc không đúng định dạng.");
        }
      } catch (err) {
        console.error(err);
        setError("Lỗi khi đọc file. Vui lòng đảm bảo đây là file Excel (.xlsx, .xls) hoặc CSV hợp lệ.");
      } finally {
        setIsParsing(false);
      }
    };
    
    reader.onerror = () => {
      setError("Lỗi khi đọc file.");
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (importedHeader: string, targetColId: string) => {
    setMapping(prev => ({ ...prev, [importedHeader]: targetColId }));
  };

  const handleConfirmImport = () => {
    const newRecords: RecordData[] = parsedData.map((row, index) => {
      // Use existing _ID if present (for bulk updates), otherwise generate new
      const record: RecordData = { 
        id: row['_ID'] ? String(row['_ID']) : `rec_import_${Date.now()}_${index}` 
      };
      
      Object.entries(mapping).forEach(([importedHeader, targetColId]) => {
        if (targetColId && row[importedHeader] !== undefined && row[importedHeader] !== '') {
          record[targetColId] = row[importedHeader];
        }
      });
      
      return record;
    });

    onImport(newRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Nhập dữ liệu từ Excel/CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {!file ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Chọn file Excel (.xlsx, .xls) hoặc CSV để nhập dữ liệu vào bảng <span className="font-semibold">{activeTable.name}</span>.
              </p>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Chọn File
              </button>
            </div>
          ) : isParsing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600">Đang đọc dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
              {error}
              <button onClick={() => setFile(null)} className="block mt-2 underline font-medium">Thử lại</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex justify-between items-center">
                <span>Đã tìm thấy <strong>{parsedData.length}</strong> dòng dữ liệu. Vui lòng ghép nối các cột.</span>
                <button onClick={() => setFile(null)} className="text-blue-600 underline text-xs">Chọn file khác</button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700 w-1/2">Cột trong File Excel</th>
                      <th className="px-4 py-3 font-medium text-gray-700 w-1/2">Ghép vào cột của Bảng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedHeaders.map(header => (
                      <tr key={header} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-600">{header}</td>
                        <td className="px-4 py-2">
                          <select
                            value={mapping[header] || ''}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            <option value="">-- Bỏ qua cột này --</option>
                            {activeTable.columns.map(col => (
                              <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Hủy</button>
          <button 
            onClick={handleConfirmImport} 
            disabled={!file || isParsing || !!error || parsedData.length === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Nhập dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};
