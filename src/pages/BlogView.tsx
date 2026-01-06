import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  published: boolean;
  created_at: string;
  user_id: string;
}

const BlogView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching blog:", error);
        setNotFound(true);
      } else {
        setBlog(data);
      }
      setLoading(false);
    };

    fetchBlog();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Blog Not Found</h1>
          <p className="text-muted-foreground mb-8">The blog you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </main>
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

        <article className="space-y-8">
          {blog.image_url && (
            <img 
              src={blog.image_url} 
              alt={blog.title}
              className="w-full aspect-video object-cover rounded-2xl"
            />
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="capitalize">
                {blog.category}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(blog.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              {blog.title}
            </h1>
          </div>

          <div className="prose prose-lg max-w-none">
            {blog.content.split('\n').map((paragraph, index) => (
              <p key={index} className="text-foreground/90 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
};

export default BlogView;
