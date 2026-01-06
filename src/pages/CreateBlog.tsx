import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowLeft } from "lucide-react";

const blogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  excerpt: z.string().max(300, "Excerpt is too long").optional(),
  category: z.string().min(1, "Please select a category"),
});

const categories = ["wellness", "travel", "creativity", "growth", "lifestyle", "technology", "general"];

const CreateBlog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    published: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;
    
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('blog-images')
      .upload(fileName, imageFile);
    
    if (error) {
      console.error("Image upload error:", error);
      throw new Error("Failed to upload image");
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = blogSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: "Validation error",
        description: validation.error.errors[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      let imageUrl: string | null = null;
      
      if (imageFile) {
        imageUrl = await uploadImage(user.id);
      }
      
      const { error } = await supabase.from('blogs').insert({
        user_id: user.id,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || formData.content.substring(0, 150) + "...",
        category: formData.category,
        image_url: imageUrl,
        published: formData.published,
      });

      if (error) throw error;

      toast({
        title: "Blog created!",
        description: formData.published ? "Your blog is now live." : "Your blog has been saved as a draft.",
      });
      
      navigate("/my-blogs");
    } catch (error: any) {
      console.error("Blog creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create blog",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Create New Blog</h1>
            <p className="text-muted-foreground mt-2">Share your thoughts with the world</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div 
                className="border-2 border-dashed border-input rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-64 mx-auto rounded-lg object-cover"
                  />
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Click to upload an image</p>
                    <p className="text-sm text-muted-foreground">Max 5MB</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter your blog title"
                className="text-lg"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt (optional)</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="A brief summary of your blog (auto-generated if left empty)"
                rows={2}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your blog content here..."
                rows={12}
                className="resize-y min-h-[200px]"
              />
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="font-medium">Publish immediately</p>
                <p className="text-sm text-muted-foreground">
                  {formData.published ? "Your blog will be visible to everyone" : "Save as draft"}
                </p>
              </div>
              <Switch
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 py-6 text-lg rounded-xl"
              >
                {submitting ? "Creating..." : formData.published ? "Publish Blog" : "Save Draft"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateBlog;
