-- SmartConvoy AI Database Schema
-- Run this file to create all necessary tables

-- Create users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
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
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_convoys_priority ON convoys(priority);
CREATE INDEX IF NOT EXISTS idx_convoys_created_at ON convoys(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_convoy_id ON vehicles(convoy_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_routes_convoy_id ON routes(convoy_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Display success message
SELECT 'Database schema created successfully!' AS status;
