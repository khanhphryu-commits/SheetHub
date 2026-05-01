import { ColType, Table, User, Folder } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Nguyễn Văn A', avatar: 'https://picsum.photos/seed/u1/32/32' },
  { id: 'u2', name: 'Trần Thị B', avatar: 'https://picsum.photos/seed/u2/32/32' },
  { id: 'u3', name: 'Lê Hoàng C', avatar: 'https://picsum.photos/seed/u3/32/32' },
  { id: 'u4', name: 'Phạm D', avatar: 'https://picsum.photos/seed/u4/32/32' },
];

export const INITIAL_FOLDERS: Folder[] = [
  { id: 'fld_admin', name: 'Hành chính & Nhân sự' },
  { id: 'fld_assets', name: 'Quản lý tài sản' }
];

export const INITIAL_TABLES: Table[] = [
  {
    id: 'tbl_departments',
    name: 'Phòng ban',
    folderId: 'fld_admin',
    columns: [
      { id: 'col_dept_name', name: 'Tên phòng ban', type: ColType.TEXT },
      { id: 'col_dept_manager', name: 'Trưởng phòng', type: ColType.USER },
      { id: 'col_dept_budget', name: 'Ngân sách (VNĐ)', type: ColType.NUMBER },
    ],
    records: [
      { id: 'rec_d1', col_dept_name: 'Phòng IT', col_dept_manager: 'u1', col_dept_budget: 500000000 },
      { id: 'rec_d2', col_dept_name: 'Phòng Marketing', col_dept_manager: 'u2', col_dept_budget: 300000000 },
      { id: 'rec_d3', col_dept_name: 'Phòng Hành chính', col_dept_manager: 'u3', col_dept_budget: 150000000 },
    ]
  },
  {
    id: 'tbl_equipment',
    name: 'Thiết bị văn phòng',
    folderId: 'fld_assets',
    isPinned: true, // Pinned by default
    columns: [
      { id: 'col_image', name: 'Ảnh minh họa', type: ColType.IMAGE },
      { id: 'col_name', name: 'Tên thiết bị', type: ColType.TEXT },
      { id: 'col_price', name: 'Giá trị (VNĐ)', type: ColType.NUMBER },
      { id: 'col_status', name: 'Trạng thái', type: ColType.SELECT, options: ['Mới', 'Đang sử dụng', 'Cần bảo trì'] },
      { id: 'col_assignee', name: 'Người giữ', type: ColType.USER },
      { id: 'col_department', name: 'Thuộc phòng ban', type: ColType.LINK, linkedTableId: 'tbl_departments', linkedColumnId: 'col_dept_name' },
      { id: 'col_dept_manager_link', name: 'Trưởng phòng (Link sâu)', type: ColType.LINK, linkedTableId: 'tbl_departments', linkedColumnId: 'col_dept_manager' },
    ],
    records: [
      { id: 'rec_e1', col_image: 'https://picsum.photos/seed/mac/100/100', col_name: 'MacBook Pro M2', col_price: 35000000, col_status: 'Đang sử dụng', col_assignee: 'u1', col_department: 'rec_d1', col_dept_manager_link: 'rec_d1' },
      { id: 'rec_e2', col_image: 'https://picsum.photos/seed/dell/100/100', col_name: 'Màn hình Dell 27"', col_price: 8000000, col_status: 'Mới', col_assignee: 'u2', col_department: 'rec_d2', col_dept_manager_link: 'rec_d2' },
      { id: 'rec_e3', col_image: 'https://picsum.photos/seed/canon/100/100', col_name: 'Máy in Canon', col_price: 4500000, col_status: 'Đang sử dụng', col_assignee: 'u3', col_department: 'rec_d3', col_dept_manager_link: 'rec_d3' },
    ]
  }
];
