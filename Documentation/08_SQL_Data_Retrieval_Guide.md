# 08. SQL Data Retrieval Guide

If your examiners ask you to demonstrate SQL queries directly on the database during your Viva, you can open the **Query Tool** in pgAdmin4 and run these exact queries.

> **To open the Query Tool:** In pgAdmin4, right-click the `neondb` database and select **Query Tool**. Paste the code and press **F5** (or click the Play button) to execute.

## 1. Doctors Queries

**View all registered doctors:**
```sql
SELECT id, full_name, email, role, hospital, is_approved 
FROM doctors 
ORDER BY id ASC;
```

**View doctors waiting for admin approval:**
```sql
SELECT full_name, email, medical_license_id 
FROM doctors 
WHERE is_approved = 0 AND role = 'doctor';
```

**Count how many doctors are from each hospital:**
```sql
SELECT hospital, COUNT(*) as doctor_count 
FROM doctors 
GROUP BY hospital 
ORDER BY doctor_count DESC;
```

## 2. Patients & Scans Queries

**View all patient scans (Hide the massive Base64 image column):**
```sql
SELECT id, patient_name, age, gender, prediction_result, subtype, scan_date 
FROM patients 
ORDER BY scan_date DESC;
```

**Find a specific patient by name (e.g., "John"):**
```sql
SELECT * FROM patients 
WHERE patient_name ILIKE '%john%';
```

**Count the total number of scans grouped by ML result:**
```sql
SELECT prediction_result, COUNT(*) as total_cases 
FROM patients 
GROUP BY prediction_result;
```

**Count cases by specific cancer subtype:**
```sql
SELECT subtype, COUNT(*) as subtype_count 
FROM patients 
WHERE subtype != 'Normal / Benign Lung Tissue'
GROUP BY subtype;
```

**View all High-Risk patients (Survival < 40%):**
```sql
SELECT patient_name, age, subtype, survival_probability 
FROM patients 
WHERE CAST(survival_probability AS FLOAT) < 0.40;
```

## 3. Audit Log Queries

**View the last 10 security events in the system:**
```sql
SELECT timestamp, actor_name, action, detail, ip_address 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

**Find all logins from a specific doctor (using their ID):**
```sql
SELECT timestamp, action, detail 
FROM audit_logs 
WHERE actor_id = '1' AND action = 'Login'
ORDER BY timestamp DESC;
```

## 4. Emergency Fixes (Updates & Deletes)

**Manually approve a doctor without using the Admin panel:**
```sql
UPDATE doctors 
SET is_approved = 1 
WHERE email = 'demo@cancerscan.app';
```

**Delete a specific test patient record (if you messed up a demo):**
```sql
DELETE FROM patients 
WHERE id = 5;
```

> [!WARNING]
> Be very careful with `UPDATE` and `DELETE` commands. Always use a `WHERE` clause, otherwise you will modify/delete every row in the entire table!
