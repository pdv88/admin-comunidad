-- Create table for Community Documents
CREATE TABLE IF NOT EXISTS public.community_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'guideline', -- 'guideline', 'rule', 'notice', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.community_documents ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone in the community can VIEW documents
CREATE POLICY "Community members can view documents" ON public.community_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.profile_id = auth.uid()
      AND community_members.community_id = community_documents.community_id
    )
  );

-- 2. Only Admins/President can INSERT/DELETE/UPDATE
CREATE POLICY "Admins and Presidents can manage documents" ON public.community_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      JOIN public.member_roles mr ON mr.member_id = cm.id
      JOIN public.roles r ON r.id = mr.role_id
      WHERE cm.profile_id = auth.uid()
      AND cm.community_id = community_documents.community_id
      AND r.name IN ('super_admin', 'president', 'admin')
    )
  );
