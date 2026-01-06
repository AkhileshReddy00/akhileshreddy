-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Users can view published blogs
CREATE POLICY "Anyone can view published blogs" 
ON public.blogs 
FOR SELECT 
USING (published = true);

-- Users can view their own blogs (including drafts)
CREATE POLICY "Users can view own blogs" 
ON public.blogs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own blogs
CREATE POLICY "Users can create blogs" 
ON public.blogs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own blogs
CREATE POLICY "Users can update own blogs" 
ON public.blogs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own blogs
CREATE POLICY "Users can delete own blogs" 
ON public.blogs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Storage policies for blog images
CREATE POLICY "Anyone can view blog images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own blog images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own blog images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();