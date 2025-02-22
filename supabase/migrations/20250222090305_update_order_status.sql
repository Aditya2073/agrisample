-- Update orders table to include additional status values
ALTER TABLE orders 
  DROP CONSTRAINT orders_status_check,
  ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'shipped', 'delivered'));
