import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Column, RecordData, Table, Folder, ColType } from './types';
import { INITIAL_TABLES, INITIAL_FOLDERS } from './constants';
import { SettingsIcon, PlusIcon, SparklesIcon, TrashIcon, TableIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, FolderIcon, FolderOpenIcon, ChevronRightIcon, ChevronDownIcon, PinIcon, PinSolidIcon, PaperClipIcon, XMarkIcon, ClipboardDocumentIcon } from './components/Icons';
import { CellEditor, getDisplayText } from './components/CellEditor';
import { ColumnManager } from './components/ColumnManager';
import { ImportModal } from './components/ImportModal';
import { AiPreviewModal } from './components/AiPreviewModal';
import { PasteFromSheetModal } from './components/PasteFromSheetModal';
import { parseInputToRecord } from './services/geminiService';

function App() {
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [activeTableId, setActiveTableId] = useState<string>(INITIAL_TABLES[0].id);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initialize all folders as expanded
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
    INITIAL_FOLDERS.reduce((acc, f) => ({ ...acc, [f.id]: true }), {})
  );
  
  // AI Input State
  const [aiInputText, setAiInputText] = useState('');
  const [aiInputImage, setAiInputImage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreviewData, setAiPreviewData] = useState<RecordData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTable = tables.find(t => t.id === activeTableId) || tables[0];

  // Reset search when switching tables
  useEffect(() => {
    setSearchQuery('');
  }, [activeTableId]);

  const handleUpdateCell = useCallback((tableId: string, recordId: string, columnId: string, newValue: any) => {
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== tableId) return table;
      return {
        ...table,
        records: table.records.map(record => 
          record.id === recordId ? { ...record, [columnId]: newValue } : record
        )
      };
    }));
  }, []);

  const handleAddRow = () => {
    const newRecord: RecordData = { id: `rec_${Date.now()}` };
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== activeTableId) return table;
      return { ...table, records: [...table.records, newRecord] };
    }));
  };

  const handleDeleteRow = (recordId: string) => {
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== activeTableId) return table;
      return { ...table, records: table.records.filter(r => r.id !== recordId) };
    }));
  };

  const handleUpdateColumns = (newColumns: Column[]) => {
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== activeTableId) return table;
      return { ...table, columns: newColumns };
    }));
  };

  const handleAddTable = (folderId?: string) => {
    const tableName = prompt("Nhập tên bảng mới:");
    if (tableName && tableName.trim()) {
      const newTable: Table = {
        id: `tbl_${Date.now()}`,
        name: tableName.trim(),
        folderId: folderId,
        columns: [{ id: `col_${Date.now()}`, name: 'Tên', type: 'text' as any }],
        records: []
      };
      setTables([...tables, newTable]);
      setActiveTableId(newTable.id);
      if (folderId) {
        setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
      }
    }
  };

  const handleAddFolder = () => {
    const folderName = prompt("Nhập tên thư mục mới:");
    if (folderName && folderName.trim()) {
      const newFolder: Folder = {
        id: `fld_${Date.now()}`,
        name: folderName.trim()
      };
      setFolders([...folders, newFolder]);
      setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const togglePinTable = (tableId: string) => {
    setTables(prevTables => prevTables.map(table => 
      table.id === tableId ? { ...table, isPinned: !table.isPinned } : table
    ));
  };

  const handleImportData = (importedRecords: RecordData[]) => {
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== activeTableId) return table;

      let updatedRecords = [...table.records];
      const newRecordsToAdd: RecordData[] = [];

      importedRecords.forEach(importedRec => {
        const existingIndex = updatedRecords.findIndex(r => r.id === importedRec.id);
        if (existingIndex >= 0) {
          // Update existing record
          updatedRecords[existingIndex] = { ...updatedRecords[existingIndex], ...importedRec };
        } else {
          // Add new record
          newRecordsToAdd.push(importedRec);
        }
      });

      return { ...table, records: [...newRecordsToAdd, ...updatedRecords] };
    }));
  };

  const handlePasteFromSheet = (headers: string[], rows: string[][]) => {
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== activeTableId) return table;

      let currentColumns = [...table.columns];
      const newRecords: RecordData[] = [];
      const headerToColIdMap: Record<number, string> = {};

      // 1. Map headers to column IDs, create new columns if needed
      headers.forEach((header, index) => {
        const existingCol = currentColumns.find(c => c.name.toLowerCase() === header.toLowerCase());
        if (existingCol) {
          headerToColIdMap[index] = existingCol.id;
        } else {
          const newColId = `col_${Date.now()}_${index}`;
          currentColumns.push({
            id: newColId,
            name: header,
            type: ColType.TEXT // Default to text for pasted data
          });
          headerToColIdMap[index] = newColId;
        }
      });

      // 2. Create records
      rows.forEach((row, rowIndex) => {
        // Skip completely empty rows
        if (row.every(cell => !cell.trim())) return;

        const record: RecordData = { id: `rec_paste_${Date.now()}_${rowIndex}` };
        row.forEach((cell, cellIndex) => {
          const colId = headerToColIdMap[cellIndex];
          if (colId && cell.trim() !== '') {
            record[colId] = cell.trim();
          }
        });
        newRecords.push(record);
      });

      return {
        ...table,
        columns: currentColumns,
        records: [...newRecords, ...table.records]
      };
    }));
  };

  const handleExportData = () => {
    const exportData = activeTable.records.map(record => {
      const row: any = { '_ID': record.id }; // Include internal ID for bulk updates
      activeTable.columns.forEach(col => {
        row[col.name] = record[col.id];
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    // Sheet names cannot exceed 31 characters
    const safeSheetName = activeTable.name.substring(0, 31).replace(/[\\/?*\[\]]/g, '');
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName || "Data");
    XLSX.writeFile(wb, `${activeTable.name}.xlsx`);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAiInputImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setAiInputImage(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
        break; // Only handle one image at a time
      }
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!aiInputText.trim() && !aiInputImage) || isAiProcessing) return;

    setIsAiProcessing(true);
    setAiError(null);

    try {
      const extractedData = await parseInputToRecord(aiInputText, aiInputImage, activeTable.columns, tables);
      if (extractedData) {
        // If user uploaded an image and there's an empty IMAGE column, auto-fill it
        if (aiInputImage) {
          const imageCol = activeTable.columns.find(c => c.type === ColType.IMAGE);
          if (imageCol && !extractedData[imageCol.id]) {
            extractedData[imageCol.id] = aiInputImage;
          }
        }

        setAiPreviewData({
          id: `rec_${Date.now()}`,
          ...extractedData
        });
      } else {
        setAiError("Không thể trích xuất dữ liệu. Vui lòng thử lại với thông tin rõ ràng hơn.");
      }
    } catch (error) {
      setAiError("Lỗi kết nối AI. Vui lòng kiểm tra API Key hoặc thử lại sau.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleConfirmAiData = (confirmedData: RecordData) => {
    setTables(prevTables => prevTables.map(table => {
      if (table.id !== activeTableId) return table;
      return { ...table, records: [confirmedData, ...table.records] }; // Add to top
    }));
    setAiPreviewData(null);
    setAiInputText('');
    setAiInputImage(null);
  };

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return activeTable.records;
    
    const lowerQuery = searchQuery.toLowerCase();
    return activeTable.records.filter(record => {
      // Check if any column's display text contains the search query
      return activeTable.columns.some(col => {
        const cellValue = record[col.id];
        const displayText = getDisplayText(col, cellValue, tables).toLowerCase();
        return displayText.includes(lowerQuery);
      });
    });
  }, [activeTable.records, activeTable.columns, searchQuery, tables]);

  const pinnedTables = tables.filter(t => t.isPinned);
  const orphanTables = tables.filter(t => !t.folderId && !t.isPinned); // Don't show pinned tables in orphan list if they are pinned

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner mr-3">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Sheet Hub</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          
          {/* Pinned Section */}
          {pinnedTables.length > 0 && (
            <div className="mb-6">
              <div className="px-4 mb-2 flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <PinSolidIcon className="w-3.5 h-3.5" /> Đã ghim
              </div>
              <nav className="space-y-1 px-2">
                {pinnedTables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => setActiveTableId(table.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTableId === table.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <TableIcon className={`w-5 h-5 ${activeTableId === table.id ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="truncate">{table.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Không gian làm việc</span>
            <button onClick={handleAddFolder} className="text-gray-400 hover:text-blue-600" title="Thêm thư mục">
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          
          <nav className="space-y-1 px-2">
            {/* Render Folders */}
            {folders.map(folder => {
              const isExpanded = expandedFolders[folder.id];
              // Show all tables in folder, even if pinned, so folder structure remains intact
              const folderTables = tables.filter(t => t.folderId === folder.id);
              
              return (
                <div key={folder.id} className="mb-1">
                  <div className="flex items-center justify-between group px-2 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                    <div 
                      className="flex items-center gap-2 flex-1 overflow-hidden"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <span className="text-gray-400">
                        {isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                      </span>
                      <span className="text-gray-400">
                        {isExpanded ? <FolderOpenIcon className="w-4 h-4" /> : <FolderIcon className="w-4 h-4" />}
                      </span>
                      <span className="text-sm font-medium text-gray-700 truncate">{folder.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAddTable(folder.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 p-1"
                      title="Thêm bảng vào thư mục này"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Render Tables inside Folder */}
                  {isExpanded && (
                    <div className="mt-1 space-y-1">
                      {folderTables.map(table => (
                        <button
                          key={table.id}
                          onClick={() => setActiveTableId(table.id)}
                          className={`w-full flex items-center gap-3 pl-9 pr-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeTableId === table.id 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <TableIcon className={`w-4 h-4 ${activeTableId === table.id ? 'text-blue-500' : 'text-gray-400'}`} />
                          <span className="truncate">{table.name}</span>
                          {table.isPinned && <PinSolidIcon className="w-3 h-3 text-blue-400 ml-auto shrink-0" />}
                        </button>
                      ))}
                      {folderTables.length === 0 && (
                        <div className="pl-9 py-1 text-xs text-gray-400 italic">Thư mục trống</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Orphan Tables (that are not pinned) */}
            {orphanTables.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {orphanTables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => setActiveTableId(table.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTableId === table.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <TableIcon className={`w-5 h-5 ${activeTableId === table.id ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="truncate">{table.name}</span>
                  </button>
                ))}
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button 
            onClick={() => handleAddTable()}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Bảng mới (Ngoài cùng)
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <TableIcon className="w-6 h-6 text-blue-600 shrink-0" />
            <select 
              value={activeTableId}
              onChange={(e) => setActiveTableId(e.target.value)}
              className="text-lg font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full truncate"
            >
              {pinnedTables.length > 0 && (
                <optgroup label="Đã ghim">
                  {pinnedTables.map(t => <option key={t.id} value={t.id}>📌 {t.name}</option>)}
                </optgroup>
              )}
              {folders.map(folder => {
                const folderTables = tables.filter(t => t.folderId === folder.id);
                if (folderTables.length === 0) return null;
                return (
                  <optgroup key={folder.id} label={folder.name}>
                    {folderTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                );
              })}
              {orphanTables.length > 0 && (
                <optgroup label="Khác">
                  {orphanTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <button onClick={() => handleAddTable()} className="p-2 text-gray-500 hover:text-blue-600 shrink-0 ml-2">
            <PlusIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Top Bar (Desktop) */}
        <header className="hidden md:flex bg-white border-b border-gray-200 h-16 items-center px-8 justify-between shrink-0">
          <div className="flex items-center gap-2">
            {activeTable.folderId && (
              <>
                <span className="text-sm font-medium text-gray-400">{folders.find(f => f.id === activeTable.folderId)?.name}</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-300" />
              </>
            )}
            <h2 className="text-xl font-semibold text-gray-800">{activeTable.name}</h2>
            <button 
              onClick={() => togglePinTable(activeTable.id)}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors ml-1"
              title={activeTable.isPinned ? "Bỏ ghim bảng này" : "Ghim bảng này lên đầu"}
            >
              {activeTable.isPinned ? (
                <PinSolidIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <PinIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          <button 
            onClick={() => setIsColumnManagerOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-3 py-2 rounded-md border border-gray-200 transition-all"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Quản lý thuộc tính</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
          
          {/* AI Quick Input Section */}
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-1 border border-blue-100 shadow-sm shrink-0">
            <div className="bg-white rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-800">AI Auto-Structure (Nhập nhanh vào bảng {activeTable.name})</h2>
              </div>
              
              <form onSubmit={handleAiSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg px-2 shadow-inner focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Đính kèm hình ảnh"
                    >
                      <PaperClipIcon className="w-5 h-5" />
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                    />
                    <input
                      type="text"
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder='Nhập văn bản, đính kèm hoặc dán ảnh (Ctrl+V)...'
                      className="flex-1 py-2.5 px-2 text-sm outline-none bg-transparent"
                      disabled={isAiProcessing}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isAiProcessing || (!aiInputText.trim() && !aiInputImage)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap"
                  >
                    {isAiProcessing ? (
                      <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> Đang xử lý...</>
                    ) : (
                      <>Phân tích & Thêm</>
                    )}
                  </button>
                </div>
                
                {/* Image Preview Area */}
                {aiInputImage && (
                  <div className="relative inline-block w-24 h-24 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <img src={aiInputImage} alt="Upload preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setAiInputImage(null)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </form>
              {aiError && <p className="mt-2 text-xs text-red-500">{aiError}</p>}
            </div>
          </section>

          {/* Data Area */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">Dữ liệu bản ghi</h2>
                
                {/* Search Input */}
                <div className="relative flex-1 sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button 
                  onClick={() => setIsColumnManagerOpen(true)}
                  className="md:hidden flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" /> <span className="hidden sm:inline">Xuất Excel</span>
                </button>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" /> <span className="hidden sm:inline">Nhập Excel</span>
                </button>
                <button 
                  onClick={() => setIsPasteModalOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" /> <span className="hidden sm:inline">Dán từ Sheet</span>
                </button>
                <button 
                  onClick={() => handleAddRow()}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">Thêm dòng</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <th className="w-12 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    {activeTable.columns.map(col => (
                      <th key={col.id} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col.name}
                      </th>
                    ))}
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3 text-center text-sm text-gray-400">{index + 1}</td>
                      {activeTable.columns.map(col => (
                        <td key={col.id} className="px-4 py-2 align-middle">
                          <CellEditor 
                            column={col} 
                            value={record[col.id]} 
                            tables={tables}
                            onChange={(val) => handleUpdateCell(activeTable.id, record.id, col.id, val)} 
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDeleteRow(record.id)}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Xóa dòng"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={activeTable.columns.length + 2} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {activeTable.records.length === 0 
                          ? "Chưa có dữ liệu. Hãy thêm dòng mới, nhập từ Excel hoặc dùng AI để nhập nhanh."
                          : "Không tìm thấy kết quả nào phù hợp với tìm kiếm của bạn."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50 flex-1 overflow-y-auto">
              {filteredRecords.map((record, index) => (
                <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                  <div className="absolute top-4 right-4">
                     <button 
                        onClick={() => handleDeleteRow(record.id)}
                        className="text-gray-400 hover:text-red-500 p-1 bg-gray-50 rounded-full"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Bản ghi #{index + 1}</div>
                  <div className="space-y-3">
                    {activeTable.columns.map(col => (
                      <div key={col.id} className="flex flex-col">
                        <span className="text-xs text-gray-500 mb-1">{col.name}</span>
                        <div className="bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors">
                          <CellEditor 
                            column={col} 
                            value={record[col.id]} 
                            tables={tables}
                            onChange={(val) => handleUpdateCell(activeTable.id, record.id, col.id, val)} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-gray-100">
                  {activeTable.records.length === 0 
                    ? "Chưa có dữ liệu."
                    : "Không tìm thấy kết quả."}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {isColumnManagerOpen && (
        <ColumnManager 
          activeTable={activeTable}
          allTables={tables}
          onUpdateColumns={handleUpdateColumns} 
          onClose={() => setIsColumnManagerOpen(false)} 
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          activeTable={activeTable}
          onImport={handleImportData}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {isPasteModalOpen && (
        <PasteFromSheetModal
          activeTable={activeTable}
          onImport={handlePasteFromSheet}
          onClose={() => setIsPasteModalOpen(false)}
        />
      )}

      {aiPreviewData && (
        <AiPreviewModal
          initialData={aiPreviewData}
          columns={activeTable.columns}
          tables={tables}
          onConfirm={handleConfirmAiData}
          onClose={() => setAiPreviewData(null)}
        />
      )}
    </div>
  );
}

export default App;
