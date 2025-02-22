export type UserRole = 'farmer' | 'buyer';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

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
  name: string;
  description: string;
  quantity: number;
  price: number;
  status: 'available' | 'sold' | 'cancelled';
  farmer_id: string;
  created_at: string;
  farmer?: Profile;
}

export interface Order {
  id: string;
  produce_id: string;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled' | 'shipped' | 'delivered' | 'received' | 'refunded';
  created_at: string;
  produce?: Produce;
  seller?: Profile;
  buyer?: Profile;
}