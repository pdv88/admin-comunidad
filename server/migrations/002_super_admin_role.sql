-- Add super_admin role to roles table
INSERT INTO roles (name) VALUES ('super_admin') ON CONFLICT DO NOTHING;
