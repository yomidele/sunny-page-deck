import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Trash2, Plus, Edit2 } from "lucide-react";
import {
  getVideos,
  createVideo,
  deleteVideo,
  updateVideo,
  Video,
  getYoutubeThumbnail,
} from "@/lib/contentManagement";

const ManageVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    youtube_url: "",
    title: "",
    description: "",
    duration_seconds: undefined as number | undefined,
  });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    const data = await getVideos();
    setVideos(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.youtube_url || !form.title) {
      alert("YouTube URL and title are required");
      return;
    }

    if (editingId) {
      const result = await updateVideo(editingId, {
        title: form.title,
        description: form.description,
        duration_seconds: form.duration_seconds,
      } as any);

      if (result.success) {
        setEditingId(null);
        loadVideos();
        resetForm();
      } else {
        alert("Error updating video: " + result.error);
      }
    } else {
      const result = await createVideo({
        youtube_url: form.youtube_url,
        title: form.title,
        description: form.description,
        duration_seconds: form.duration_seconds,
      });

      if (result.success) {
        setIsAdding(false);
        loadVideos();
        resetForm();
      } else {
        alert("Error creating video: " + result.error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;

    const result = await deleteVideo(id);
    if (result.success) {
      loadVideos();
    } else {
      alert("Error deleting video: " + result.error);
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setForm({
      youtube_url: video.youtube_url,
      title: video.title,
      description: video.description || "",
      duration_seconds: video.duration_seconds,
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setForm({
      youtube_url: "",
      title: "",
      description: "",
      duration_seconds: undefined,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Manage Videos
          </h1>
          <p className="text-sm text-muted-foreground">
            Add YouTube videos to the learning resources section
          </p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            Add Video
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Video" : "Add New Video"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">YouTube URL *</label>
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  value={form.youtube_url}
                  onChange={(e) =>
                    setForm({ ...form, youtube_url: e.target.value })
                  }
                  disabled={!!editingId}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  type="text"
                  placeholder="e.g., Introduction to JAMB CBT"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Brief description of the video..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Duration (seconds)</label>
                <Input
                  type="number"
                  placeholder="e.g., 745"
                  value={form.duration_seconds || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration_seconds: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingId ? "Update" : "Create"}
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
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">No videos yet</p>
            <Button
              onClick={() => setIsAdding(true)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-5 w-5" />
              Add First Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                <img
                  src={video.thumbnail_url || getYoutubeThumbnail(video.video_id)}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-4">
                <h3 className="font-semibold line-clamp-2 mb-2">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {video.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(video)}
                    className="flex-1 gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(video.id)}
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

export default ManageVideos;
