import { GoogleGenAI, Type } from '@google/genai';
import { Column, ColType, Table } from '../types';
import { MOCK_USERS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

// Helper to resolve deep link text for AI context
const resolveText = (colDef: Column, val: any, allTables: Table[], depth = 0): string => {
  if (val == null || val === '') return '';
  if (depth > 5) return '...'; // Prevent infinite loops
  
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
        return resolveText(targetColDef, linkedRecord[targetColId], allTables, depth + 1);
      }
    }
  }
  
  return String(val);
};

export const parseInputToRecord = async (text: string, imageBase64: string | null, columns: Column[], tables: Table[]): Promise<Record<string, any> | null> => {
  try {
    const properties: Record<string, any> = {};
    const linkMaps: Record<string, Record<string, string>> = {}; // Maps columnId -> { "Resolved Text": "Record ID" }

    columns.forEach(col => {
      let genAiType = Type.STRING;
      let description = `Trích xuất thông tin cho trường '${col.name}'.`;

      if (col.type === ColType.NUMBER) {
        genAiType = Type.NUMBER;
        description += ' Chỉ trả về số.';
      } else if (col.type === ColType.DATE) {
        description += ' Định dạng YYYY-MM-DD nếu có thể.';
      } else if (col.type === ColType.SELECT && col.options) {
        description += ` Chọn một trong các giá trị sau nếu phù hợp: ${col.options.join(', ')}.`;
      } else if (col.type === ColType.USER) {
        description += ' Trích xuất tên người.';
      } else if (col.type === ColType.IMAGE) {
        description += ' Trích xuất URL của hình ảnh nếu có trong văn bản.';
      } else if (col.type === ColType.LINK && col.linkedTableId) {
        // Handle deep relational data
        const linkedTable = tables.find(t => t.id === col.linkedTableId);
        if (linkedTable && linkedTable.columns.length > 0) {
          const targetColId = col.linkedColumnId || linkedTable.columns[0].id;
          const targetColDef = linkedTable.columns.find(c => c.id === targetColId);
          
          if (targetColDef) {
            const options: string[] = [];
            linkMaps[col.id] = {};
            
            linkedTable.records.forEach(r => {
              const resolvedText = resolveText(targetColDef, r[targetColId], tables);
              if (resolvedText) {
                linkMaps[col.id][resolvedText] = r.id;
                if (!options.includes(resolvedText)) {
                  options.push(resolvedText);
                }
              }
            });
            
            if (options.length > 0) {
              description += ` Chọn một trong các giá trị sau: ${options.join(', ')}.`;
            }
          }
        }
      }

      properties[col.id] = {
        type: genAiType,
        description: description,
      };
    });

    const parts: any[] = [];
    let promptText = 'Phân tích thông tin sau và trích xuất vào các trường dữ liệu tương ứng. Nếu không tìm thấy thông tin cho một trường, hãy để trống (null hoặc chuỗi rỗng).\n\n';

    if (text) {
      promptText += `Văn bản/Yêu cầu: "${text}"\n`;
    }
    if (imageBase64) {
       promptText += `Vui lòng phân tích hình ảnh đính kèm để lấy thông tin.`;
    }

    parts.push({ text: promptText });

    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: properties,
        },
        temperature: 0.1,
      },
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      
      // Post-process: Convert linked names back to IDs
      Object.keys(linkMaps).forEach(colId => {
        const extractedName = result[colId];
        if (extractedName && linkMaps[colId][extractedName]) {
          result[colId] = linkMaps[colId][extractedName]; // Replace name with ID
        } else if (extractedName) {
           result[colId] = null; // Clear if it doesn't match any ID to avoid broken links
        }
      });

      return result;
    }
    return null;
  } catch (error) {
    console.error("Error parsing input with Gemini:", error);
    throw error;
  }
};
