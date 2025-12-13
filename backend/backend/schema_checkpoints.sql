-- Add checkpoints and merge history tables

-- Checkpoints table for military/strategic waypoints
CREATE TABLE IF NOT EXISTS checkpoints (
    checkpoint_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    checkpoint_type VARCHAR(50) DEFAULT 'military', -- military, toll, rest_stop, border, fuel
    capacity INT DEFAULT 10, -- max vehicles at once
    current_load INT DEFAULT 0, -- current vehicles
    status VARCHAR(20) DEFAULT 'operational', -- operational, congested, closed, maintenance
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Checkpoint events - track when convoys pass checkpoints
CREATE TABLE IF NOT EXISTS checkpoint_events (
    event_id SERIAL PRIMARY KEY,
    convoy_id INT REFERENCES convoys(convoy_id) ON DELETE CASCADE,
    checkpoint_id INT REFERENCES checkpoints(checkpoint_id) ON DELETE CASCADE,
    expected_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- pending, on_time, delayed, early, missed
    delay_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Merge history - track successful convoy merges
CREATE TABLE IF NOT EXISTS merge_history (
    merge_id SERIAL PRIMARY KEY,
    convoy_a_id INT REFERENCES convoys(convoy_id) ON DELETE CASCADE,
    convoy_b_id INT REFERENCES convoys(convoy_id) ON DELETE CASCADE,
    merged_into INT NOT NULL, -- which convoy absorbed the other
    merge_type VARCHAR(50) DEFAULT 'pickup', -- pickup, consolidation, emergency
    distance_saved_km DOUBLE PRECISION,
    fuel_saved_liters DOUBLE PRECISION,
    cost_saved_inr DOUBLE PRECISION,
    detour_minutes DOUBLE PRECISION,
    merged_at TIMESTAMP DEFAULT NOW(),
    merged_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'completed', -- suggested, accepted, completed, cancelled
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkpoints_location ON checkpoints(lat, lon);
CREATE INDEX IF NOT EXISTS idx_checkpoint_events_convoy ON checkpoint_events(convoy_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_events_checkpoint ON checkpoint_events(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_convoys ON merge_history(convoy_a_id, convoy_b_id);

-- Insert mock checkpoint data for Indian Army routes
INSERT INTO checkpoints (name, lat, lon, checkpoint_type, capacity, status, description) VALUES
-- Delhi NCR Region
('Dhaula Kuan Military Checkpoint', 28.5939, 77.1640, 'military', 15, 'operational', 'Main checkpoint for Delhi Cantonment area'),
('Mahipalpur Border Post', 28.5448, 77.1291, 'border', 12, 'operational', 'Delhi-Gurgaon border checkpoint'),

-- Punjab-Haryana Corridor
('Ambala Cantonment Gate', 30.3782, 76.7748, 'military', 20, 'operational', 'Major Army cantonment checkpoint'),
('Kurukshetra Rest Stop', 29.9693, 76.8783, 'rest_stop', 25, 'operational', 'Strategic rest area with fuel'),

-- Jammu & Kashmir Region
('Pathankot Military Station', 32.2746, 75.6521, 'military', 30, 'operational', 'Gateway to J&K operations'),
('Jammu Tawi Checkpoint', 32.7333, 74.8570, 'military', 25, 'operational', 'Main J&K entry checkpoint'),
('Srinagar Army Base Entry', 34.0837, 74.7973, 'military', 20, 'operational', 'Srinagar cantonment checkpoint'),

-- Ladakh Route
('Udhampur Military Depot', 32.9165, 75.1420, 'military', 18, 'operational', 'Supply depot checkpoint'),
('Ramban Safety Post', 33.2432, 75.1927, 'border', 15, 'operational', 'Mountain safety checkpoint'),
('Kargil Forward Base', 34.5539, 76.1313, 'military', 10, 'operational', 'Forward area logistics hub'),
('Leh Military Checkpoint', 34.1526, 77.5771, 'military', 12, 'operational', 'High altitude base checkpoint'),

-- Eastern Sector
('Meerut Cantonment Gate', 28.9845, 77.7064, 'military', 20, 'operational', 'UP military zone checkpoint'),
('Bareilly Army Base', 28.3670, 79.4304, 'military', 15, 'operational', 'Eastern command checkpoint'),
('Lucknow Military Station', 26.8467, 80.9462, 'military', 18, 'operational', 'Central UP checkpoint'),

-- Rajasthan Border
('Jaisalmer Forward Post', 26.9157, 70.9083, 'border', 12, 'operational', 'Western desert checkpoint'),
('Bikaner Military Area', 28.0229, 73.3119, 'military', 15, 'operational', 'Desert operations base'),
('Jodhpur Air Base Entry', 26.2389, 73.0243, 'military', 20, 'operational', 'Joint forces checkpoint'),

-- Southern Sector
('Bangalore Military Station', 12.9634, 77.6074, 'military', 25, 'operational', 'Southern command hub'),
('Secunderabad Cantonment', 17.4474, 78.5009, 'military', 20, 'operational', 'Telangana military zone'),
('Chennai Port Checkpoint', 13.0827, 80.2707, 'border', 18, 'operational', 'Coastal security checkpoint'),

-- North-East Region
('Siliguri Corridor Post', 26.7271, 88.3953, 'border', 15, 'operational', 'Strategic Chicken Neck checkpoint'),
('Guwahati Army Base', 26.1445, 91.7362, 'military', 20, 'operational', 'NE operations hub'),
('Dimapur Military Station', 25.9090, 93.7330, 'military', 12, 'operational', 'Nagaland checkpoint'),
('Tezpur Air Base Gate', 26.6338, 92.8004, 'military', 15, 'operational', 'Assam forward base'),

-- Central India
('Jabalpur Cantonment', 23.1815, 79.9864, 'military', 18, 'operational', 'Central India military hub'),
('Bhopal Military Area', 23.2599, 77.4126, 'military', 15, 'operational', 'MP regional checkpoint'),

-- Highway Strategic Points
('NH-1 Panipat Toll', 29.3879, 76.9682, 'toll', 30, 'operational', 'Major highway checkpoint'),
('NH-44 Nagpur Junction', 21.1458, 79.0882, 'rest_stop', 35, 'operational', 'Central India transit point'),
('NH-8 Udaipur Checkpoint', 24.5854, 73.7125, 'border', 20, 'operational', 'Rajasthan highway point'),
('NH-27 Porbandar Coast', 21.6417, 69.6293, 'border', 12, 'operational', 'Western coast checkpoint'),
('NH-48 Mumbai Entry', 19.0760, 72.8777, 'border', 40, 'operational', 'Major metropolitan entry point')
ON CONFLICT DO NOTHING;

-- Add sample checkpoint events for existing convoys (if any exist)
-- This will be populated automatically as convoys are created
