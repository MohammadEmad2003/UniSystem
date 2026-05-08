# API Test Script for UniSystem Attendance
$baseUrl = "http://localhost:3000/api"
$lecId = 1
$studentId = 1
$nfcUid = "ABC123"

Write-Host "--- Testing Lecture Start ---"
Invoke-RestMethod -Uri "$baseUrl/classes/lectures/$lecId/start" -Method Post -Headers @{ Authorization = "Bearer YOUR_TOKEN_HERE" }

Write-Host "`n--- Testing NFC Attendance ---"
$nfcBody = @{ uid = $nfcUid; lec_id = $lecId }
Invoke-RestMethod -Uri "$baseUrl/attendance/nfc" -Method Post -Body ($nfcBody | ConvertTo-Json) -ContentType "application/json"

Write-Host "`n--- Testing Manual Attendance ---"
$manualBody = @{ studentId = $studentId; password = "123"; lec_id = $lecId }
Invoke-RestMethod -Uri "$baseUrl/attendance/manual" -Method Post -Body ($manualBody | ConvertTo-Json) -ContentType "application/json"

Write-Host "`n--- Testing Lecture End ---"
Invoke-RestMethod -Uri "$baseUrl/classes/lectures/$lecId/end" -Method Post -Headers @{ Authorization = "Bearer YOUR_TOKEN_HERE" }
