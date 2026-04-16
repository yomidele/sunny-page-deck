import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Trash2, Plus, Edit2 } from "lucide-react";
import {
  getPosts,
  createPost,
  deletePost,
  updatePost,
  Post,
} from "@/lib/contentManagement";

const ManagePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    featured_image: "",
    excerpt: "",
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const data = await getPosts(100);
    setPosts(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.content) {
      alert("Title and content are required");
      return;
    }

    if (editingId) {
      const result = await updatePost(editingId, {
        title: form.title,
        content: form.content,
        featured_image: form.featured_image || undefined,
        excerpt: form.excerpt || undefined,
      } as any);

      if (result.success) {
        setEditingId(null);
        loadPosts();
        resetForm();
      } else {
        alert("Error updating post: " + result.error);
      }
    } else {
      const result = await createPost({
        title: form.title,
        content: form.content,
        featured_image: form.featured_image || undefined,
        excerpt: form.excerpt || undefined,
      });

      if (result.success) {
        setIsAdding(false);
        loadPosts();
        resetForm();
      } else {
        alert("Error creating post: " + result.error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;

    const result = await deletePost(id);
    if (result.success) {
      loadPosts();
    } else {
      alert("Error deleting post: " + result.error);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      content: post.content,
      featured_image: post.featured_image || "",
      excerpt: post.excerpt || "",
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      featured_image: "",
      excerpt: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Manage Blog Posts
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage blog posts for the news section
          </p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            New Post
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Post" : "Create New Post"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  type="text"
                  placeholder="e.g., Tips for Passing JAMB"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Excerpt</label>
                <Input
                  type="text"
                  placeholder="Short preview of the post..."
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm({ ...form, excerpt: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Content *</label>
                <Textarea
                  placeholder="Full post content..."
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  rows={8}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Featured Image URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={form.featured_image}
                  onChange={(e) =>
                    setForm({ ...form, featured_image: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingId ? "Update" : "Publish"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">No posts yet</p>
            <Button
              onClick={() => setIsAdding(true)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-5 w-5" />
              Create First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      {post.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                <p className="text-sm mb-4 line-clamp-3">
                  {post.content}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(post)}
                    className="gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(post.id)}
                    className="gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default ManagePosts;
