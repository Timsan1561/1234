// Описание пользователя системы
export interface User {
  id: number;
  username: string;
  role: 'Admin' | 'Supervisor' | 'Operator';
}

// Описание производственной линии
export interface Line {
  id: number;
  name: string;
  equipmentList?: Equipment[];
}

// Описание единицы оборудования (привязана к линии и имеет QR-код)
export interface Equipment {
  id: number;
  code: string;
  name: string;
  lineId: number;
}

// Описание комментария к дефекту
export interface DefectComment {
  id: number;
  defectId: int;
  text: string;
  author: string;
  createdAt: string;
}

// Описание дефекта оборудования (полностью соответствует твоей БД на C#)
export interface Defect {
  id: number;
  equipmentCode: string;
  problemType: string;
  description: string;
  author: string;
  photoUrl: string;
  createdAt: string;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  closingComment?: string;
  closePhotoUrl?: string;
  comments?: DefectComment[];
}