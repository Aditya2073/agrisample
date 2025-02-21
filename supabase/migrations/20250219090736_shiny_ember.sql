/*
  # Add INSERT policy for profiles table

  1. Changes
    - Add policy to allow users to insert their own profile
    
  2. Security
    - Users can only create a profile for themselves
    - Profile ID must match their auth.uid
*/

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);