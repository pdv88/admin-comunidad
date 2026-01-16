-- 1. Create Amenities Table (Common Areas)
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_reservable BOOLEAN DEFAULT FALSE,
    reservation_limits JSONB DEFAULT '{}'::jsonb, -- e.g. { "max_hours": 2, "max_advance_days": 30 }
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL, -- Optional: link to unit for "per unit" limits
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    notes TEXT, -- User request notes
    admin_notes TEXT, -- Rejection reason or approval note
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Amenities Policies
-- Everyone in the community can view amenities
CREATE POLICY "Amenities are viewable by community members" 
ON amenities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM community_members 
        WHERE community_members.community_id = amenities.community_id 
        AND community_members.profile_id = auth.uid()
    )
);

-- Only Admins/Presidents can manage amenities (We usually handle this via API with Service Key, but for safety:)
-- (Assuming we have a way to check roles via RLS, if not, we rely on API logic. 
-- For now, we'll allow Authenticated users to READ, and restrict writes to Service Role or valid admins if we had a function.)

-- Reservations Policies
-- Users can view their own reservations
CREATE POLICY "Users can view own reservations" 
ON reservations FOR SELECT 
USING (
    auth.uid() = user_id
);

-- Community Admins can view all reservations
-- (Complex RLS, rely on API for Admin listing usually, or add policy if needed)

-- Users can insert their own reservation
CREATE POLICY "Users can create reservations" 
ON reservations FOR INSERT 
WITH CHECK (
    auth.uid() = user_id
);

-- Users can update status to 'cancelled' for their own
CREATE POLICY "Users can cancel own pending reservations" 
ON reservations FOR UPDATE 
USING (
    auth.uid() = user_id AND status = 'pending'
)
WITH CHECK (
    status = 'cancelled'
);
