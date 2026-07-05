-- Create NFC devices table for storing registered devices
CREATE TABLE IF NOT EXISTS nfc_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    student_id INTEGER NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50) DEFAULT 'mobile',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nfc_devices_device_id ON nfc_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_nfc_devices_student_id ON nfc_devices(student_id);
CREATE INDEX IF NOT EXISTS idx_nfc_devices_is_active ON nfc_devices(is_active);
