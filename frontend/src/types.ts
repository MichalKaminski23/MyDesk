export interface Resource {
  id: number;
  name: string;
  type: 'desk' | 'room';
  capacity: number;
  location: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  phone_number: string;
  role: 'employee' | 'admin';
  is_active: boolean;
}

export interface Reservation {
  id: number;
  user_id: number;
  resource_id: number;
  start_time: string;
  end_time: string;
  status: 'active' | 'cancelled';
  resource: Resource | null;
}

export interface TimeFilter {
  date: string;
  start: string;
  end: string;
}

export type View = 'spaces' | 'reservations' | 'admin';
