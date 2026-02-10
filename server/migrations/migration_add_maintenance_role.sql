-- Add 'maintenance' role to roles table
INSERT INTO roles (name) VALUES ('maintenance') ON CONFLICT (name) DO NOTHING;

-- Verify it exists
select * from roles where name = 'maintenance';
