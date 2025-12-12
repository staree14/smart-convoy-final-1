-- Add status column to convoys table
ALTER TABLE convoys
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Update existing convoys to have 'en_route' status if they have routes
UPDATE convoys
SET status = 'en_route'
WHERE convoy_id IN (SELECT DISTINCT convoy_id FROM routes);

-- Add comment explaining status values
COMMENT ON COLUMN convoys.status IS 'Convoy status: pending, en_route, completed, cancelled';
