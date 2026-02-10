-- Add 'security' role to roles table
INSERT INTO roles (name) VALUES ('security') ON CONFLICT (name) DO NOTHING;

-- Optional: Verify it exists
select * from roles where name = 'security';
