-- SmartConvoy AI Database Schema
-- Run this file to create all necessary tables

-- Create service_registry table (Authorized Personnel)
CREATE TABLE IF NOT EXISTS service_registry (
    service_no VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rank VARCHAR(100),
    base_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$12$Q6dhmKFF1EkrGSdz9ul7U.96o8xaRy1xyX9CIZSbx6WjUT80TCizO', -- Default hash for 'password123' to ensure NOT NULL constraint is met for existing rows
    is_active BOOLEAN DEFAULT TRUE
);

-- Create users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- Changed from user_id to id to match python code
    service_no VARCHAR(50) UNIQUE NOT NULL REFERENCES service_registry(service_no),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'officer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create convoys table
CREATE TABLE IF NOT EXISTS convoys (
    convoy_id SERIAL PRIMARY KEY,
    convoy_name VARCHAR(255) NOT NULL,
    source_place VARCHAR(255),
    destination_place VARCHAR(255),
    source_lat DOUBLE PRECISION NOT NULL,
    source_lon DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lon DOUBLE PRECISION NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    convoy_id INTEGER NOT NULL REFERENCES convoys(convoy_id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    load_type VARCHAR(50) NOT NULL,
    load_weight_kg DOUBLE PRECISION NOT NULL,
    capacity_kg INTEGER NOT NULL,
    driver_name VARCHAR(255),
    current_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
    route_id SERIAL PRIMARY KEY,
    convoy_id INTEGER NOT NULL REFERENCES convoys(convoy_id) ON DELETE CASCADE,
    waypoints JSONB,
    total_distance_km DOUBLE PRECISION,
    estimated_duration_minutes DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- "Court-Sealed" Blockchain Logs
CREATE TABLE IF NOT EXISTS blockchain_logs (
    log_id SERIAL PRIMARY KEY,
    convoy_id INTEGER NOT NULL REFERENCES convoys(convoy_id) ON DELETE CASCADE,
    proof_hash VARCHAR(64) NOT NULL, -- SHA-256
    raw_payload TEXT, -- Stores deterministic string potentially
    action_type VARCHAR(50) DEFAULT 'CREATION',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_convoys_priority ON convoys(priority);
CREATE INDEX IF NOT EXISTS idx_convoys_created_at ON convoys(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_convoy_id ON vehicles(convoy_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_routes_convoy_id ON routes(convoy_id);
CREATE INDEX IF NOT EXISTS idx_users_service_no ON users(service_no);

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Display success message
SELECT 'Database schema created successfully!' AS status;
