-- Migrate location from free text to standardized enum values
UPDATE salary_entries SET location = 'BENGALURU'  WHERE LOWER(TRIM(location)) IN ('bengaluru','bangalore','bengalore');
UPDATE salary_entries SET location = 'HYDERABAD'  WHERE LOWER(TRIM(location)) IN ('hyderabad','hydrabad');
UPDATE salary_entries SET location = 'PUNE'        WHERE LOWER(TRIM(location)) IN ('pune');
UPDATE salary_entries SET location = 'DELHI_NCR'  WHERE LOWER(TRIM(location)) IN ('delhi ncr','delhi-ncr','delhi','ncr','gurgaon','noida','gurugram');
UPDATE salary_entries SET location = 'KOCHI'       WHERE LOWER(TRIM(location)) IN ('kochi','cochin','ernakulam');
UPDATE salary_entries SET location = 'COIMBATORE' WHERE LOWER(TRIM(location)) IN ('coimbatore','coimbatore');
UPDATE salary_entries SET location = 'MYSORE'      WHERE LOWER(TRIM(location)) IN ('mysore','mysuru');
UPDATE salary_entries SET location = 'MANGALURU'  WHERE LOWER(TRIM(location)) IN ('mangaluru','mangalore');

-- Null out unrecognized locations
UPDATE salary_entries
  SET location = NULL
  WHERE location IS NOT NULL
    AND location NOT IN ('BENGALURU','HYDERABAD','PUNE','DELHI_NCR','KOCHI','COIMBATORE','MYSORE','MANGALURU');

ALTER TABLE salary_entries ALTER COLUMN location TYPE VARCHAR(50);
