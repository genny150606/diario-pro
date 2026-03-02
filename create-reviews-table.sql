-- ==========================================
-- CREATE REVIEWS TABLE FOR DIARIO PRO
-- ==========================================

-- 1. Create the reviews table
DROP VIEW IF EXISTS public.reviews_with_users;
DROP TABLE IF EXISTS public.reviews CASCADE;

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL CHECK (char_length(content) >= 10),
    is_approved BOOLEAN DEFAULT true, -- Can be set to false for manual moderation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Everyone can read approved reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (is_approved = true);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can insert their own reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" 
ON public.reviews FOR DELETE 
USING (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" 
ON public.reviews FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Create a view to easily fetch reviews with user data
CREATE OR REPLACE VIEW public.reviews_with_users AS
SELECT 
    r.id,
    r.rating,
    r.content,
    r.created_at,
    r.user_id,
    (u.data->>'name')::text AS name,
    (u.data->>'surname')::text AS surname,
    (u.data->>'username')::text AS username
FROM 
    public.reviews r
JOIN 
    public.users_data u ON r.user_id = u.id
WHERE 
    r.is_approved = true;

-- Note: Ensure users_data table has policies allowing select for this view to work, 
-- or use security definer functions if needed. Usually, a public view joining on public tables is fine 
-- if the underlying tables allow select.
