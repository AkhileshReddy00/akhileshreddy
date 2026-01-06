import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Blog {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  published: boolean;
  created_at: string;
}

const MyBlogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchBlogs(session.user.id);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchBlogs(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchBlogs = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blogs')
      .select('id, title, excerpt, image_url, category, published, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching blogs:", error);
      toast({
        title: "Error",
        description: "Failed to load your blogs",
        variant: "destructive",
      });
    } else {
      setBlogs(data || []);
    }
    setLoading(false);
  };

  const togglePublish = async (blogId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('blogs')
      .update({ published: !currentStatus })
      .eq('id', blogId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update blog status",
        variant: "destructive",
      });
    } else {
      setBlogs(blogs.map(b => 
        b.id === blogId ? { ...b, published: !currentStatus } : b
      ));
      toast({
        title: currentStatus ? "Unpublished" : "Published",
        description: currentStatus ? "Blog is now a draft" : "Blog is now live",
      });
    }
  };

  const deleteBlog = async (blogId: string) => {
    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', blogId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete blog",
        variant: "destructive",
      });
    } else {
      setBlogs(blogs.filter(b => b.id !== blogId));
      toast({
        title: "Deleted",
        description: "Blog has been removed",
      });
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
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Blogs</h1>
            <p className="text-muted-foreground mt-2">Manage your published and draft blogs</p>
          </div>
          <Button onClick={() => navigate("/create-blog")} className="rounded-xl">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Blog
          </Button>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl">
            <p className="text-muted-foreground mb-4">You haven't created any blogs yet</p>
            <Button onClick={() => navigate("/create-blog")}>
              Create your first blog
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {blogs.map((blog) => (
              <div 
                key={blog.id}
                className="flex gap-6 p-6 bg-card rounded-2xl border border-border/50 hover:border-border transition-colors"
              >
                {blog.image_url && (
                  <img 
                    src={blog.image_url} 
                    alt={blog.title}
                    className="w-32 h-24 object-cover rounded-xl shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link 
                        to={`/blog/${blog.id}`}
                        className="text-xl font-semibold hover:text-primary transition-colors line-clamp-1"
                      >
                        {blog.title}
                      </Link>
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                        {blog.excerpt}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="secondary" className="capitalize">
                          {blog.category}
                        </Badge>
                        <Badge variant={blog.published ? "default" : "outline"}>
                          {blog.published ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(blog.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublish(blog.id, blog.published)}
                        title={blog.published ? "Unpublish" : "Publish"}
                      >
                        {blog.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/edit-blog/${blog.id}`)}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this blog?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your blog.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteBlog(blog.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyBlogs;
