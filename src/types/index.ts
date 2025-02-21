export type UserRole = 'farmer' | 'buyer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  created_at: string;
}

export interface Produce {
  id: string;
  farmer_id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  status: 'available' | 'sold';
  created_at: string;
}

export interface Order {
  id: string;
  produce_id: string;
  buyer_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
}