export enum ColType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  USER = 'user',
  LINK = 'link', // New type for relational data
  IMAGE = 'image' // New type for image data
}

export interface Column {
  id: string;
  name: string;
  type: ColType;
  options?: string[]; // For SELECT type
  linkedTableId?: string; // For LINK type
  linkedColumnId?: string; // For LINK type (deep link to specific column)
}

export interface RecordData {
  id: string;
  [key: string]: any;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Table {
  id: string;
  name: string;
  folderId?: string; // Optional: Table might belong to a folder
  isPinned?: boolean; // Optional: Table can be pinned to top
  columns: Column[];
  records: RecordData[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
