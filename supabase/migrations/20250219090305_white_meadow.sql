/*
  # Initial Schema Setup for AgriConnect

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users id
      - `email` (text, unique)
      - `name` (text)
      - `phone` (text)
      - `role` (text) - either 'farmer' or 'buyer'
      - `created_at` (timestamp)
    
    - `produce`
      - `id` (uuid, primary key)
      - `farmer_id` (uuid) - references profiles.id
      - `name` (text)
      - `description` (text)
      - `quantity` (numeric)
      - `unit` (text)
      - `price` (numeric)
      - `status` (text) - either 'available' or 'sold'
      - `created_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `produce_id` (uuid) - references produce.id
      - `buyer_id` (uuid) - references profiles.id
      - `seller_id` (uuid) - references profiles.id
      - `quantity` (numeric)
      - `total_price` (numeric)
      - `status` (text) - 'pending', 'completed', or 'cancelled'
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('farmer', 'buyer')),
  created_at timestamptz DEFAULT now()
);

-- Create produce table
CREATE TABLE IF NOT EXISTS produce (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  unit text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  status text NOT NULL CHECK (status IN ('available', 'sold')) DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produce_id uuid REFERENCES produce(id) NOT NULL,
  buyer_id uuid REFERENCES profiles(id) NOT NULL,
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Produce policies
CREATE POLICY "Anyone can view available produce"
  ON produce
  FOR SELECT
  TO authenticated
  USING (status = 'available' OR farmer_id = auth.uid());

CREATE POLICY "Farmers can insert their own produce"
  ON produce
  FOR INSERT
  TO authenticated
  WITH CHECK (
    farmer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'farmer'
    )
  );

CREATE POLICY "Farmers can update their own produce"
  ON produce
  FOR UPDATE
  TO authenticated
  USING (farmer_id = auth.uid());

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM produce
      WHERE produce.id = produce_id AND produce.farmer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'buyer'
    )
  );

CREATE POLICY "Involved parties can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    buyer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM produce
      WHERE produce.id = produce_id AND produce.farmer_id = auth.uid()
    )
  );