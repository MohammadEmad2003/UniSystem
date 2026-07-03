-- Create NFC challenges table for storing authentication challenges
CREATE TABLE IF NOT EXISTS nfc_challenges (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    challenge VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nfc_challenges_student_id ON nfc_challenges(student_id);
CREATE INDEX IF NOT EXISTS idx_nfc_challenges_device_id ON nfc_challenges(device_id);
CREATE INDEX IF NOT EXISTS idx_nfc_challenges_challenge ON nfc_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_nfc_challenges_expires_at ON nfc_challenges(expires_at);

-- Create index for cleanup of expired challenges
CREATE INDEX IF NOT EXISTS idx_nfc_challenges_used_expires ON nfc_challenges(used, expires_at);
