-- Migration to add calculation details to monthly_fees
ALTER TABLE monthly_fees 
ADD COLUMN total_budget NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN coefficient NUMERIC(10,4) DEFAULT NULL;
