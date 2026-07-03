-- Create NFC events table
CREATE TABLE IF NOT EXISTS nfc_events (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('check_in', 'check_out', 'access', 'attendance')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'verified', 'failed', 'cancelled')),
    timestamp BIGINT NOT NULL,
    location VARCHAR(255) DEFAULT 'unknown',
    metadata JSONB DEFAULT '{}',
    verified_by VARCHAR(255) DEFAULT 'nfc_system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nfc_events_student_id ON nfc_events(student_id);
CREATE INDEX IF NOT EXISTS idx_nfc_events_device_id ON nfc_events(device_id);
CREATE INDEX IF NOT EXISTS idx_nfc_events_timestamp ON nfc_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_events_student_timestamp ON nfc_events(student_id, timestamp DESC);
