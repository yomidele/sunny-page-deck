import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Zap, Award, TrendingUp, ArrowRight, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { getVideos, getPosts, Video, Post, getYoutubeThumbnail } from '@/lib/contentManagement';

const Landing = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const features = [
    {
      icon: Zap,
      title: 'Real Exam Format',
      desc: 'Practice with questions structured exactly like the JAMB CBT exam.',
    },
    {
      icon: Award,
      title: 'Expert Content',
      desc: 'Curated questions from experienced JAMB instructors.',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      desc: 'Monitor your improvement with detailed analytics.',
    },
  ];

  const defaultVideos: Video[] = [
    { id: '1', title: 'Introduction to JAMB CBT', video_id: 'dQw4w9WgXcQ', youtube_url: '', thumbnail_url: '', duration_seconds: 765, created_at: '', updated_at: '' },
    { id: '2', title: 'Time Management Tips', video_id: 'dQw4w9WgXcQ', youtube_url: '', thumbnail_url: '', duration_seconds: 510, created_at: '', updated_at: '' },
    { id: '3', title: 'Common Mistakes to Avoid', video_id: 'dQw4w9WgXcQ', youtube_url: '', thumbnail_url: '', duration_seconds: 920, created_at: '', updated_at: '' },
    { id: '4', title: 'Subject Deep Dive', video_id: 'dQw4w9WgXcQ', youtube_url: '', thumbnail_url: '', duration_seconds: 1330, created_at: '', updated_at: '' },
  ];

  const defaultPosts: Post[] = [
    {
      id: '1',
      title: 'New Practice Tests Added',
      excerpt: "We've added 500+ new practice questions...",
      content: 'Check our latest addition to the question bank.',
      featured_image: '',
      created_at: '2025-03-15T00:00:00Z',
      updated_at: '2025-03-15T00:00:00Z',
    },
    {
      id: '2',
      title: 'JAMB 2025 Schedule Released',
      excerpt: 'Official exam dates and registration info...',
      content: 'The JAMB examination board has released the official schedule.',
      featured_image: '',
      created_at: '2025-03-10T00:00:00Z',
      updated_at: '2025-03-10T00:00:00Z',
    },
    {
      id: '3',
      title: 'Study Tips from Top Scorers',
      excerpt: 'Strategies that helped students ace the exam...',
      content: 'Learn proven strategies from students who scored high on JAMB.',
      featured_image: '',
      created_at: '2025-03-05T00:00:00Z',
      updated_at: '2025-03-05T00:00:00Z',
    },
  ];

  useEffect(() => {
    loadVideos();
    loadPosts();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await getVideos();
      setVideos(data.length > 0 ? data.slice(0, 4) : defaultVideos);
    } catch (error) {
      console.error('Failed to load videos:', error);
      setVideos(defaultVideos);
    } finally {
      setLoadingVideos(false);
    }
  };

  const loadPosts = async () => {
    try {
      const data = await getPosts(3);
      setPosts(data.length > 0 ? data : defaultPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts(defaultPosts);
    } finally {
      setLoadingPosts(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] sticky top-0 z-50 bg-[#0B0B0B]/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#FFD700] rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-[#0B0B0B] font-bold" />
            </div>
            <span className="font-heading text-2xl font-bold text-[#FFD700]">MEEKAH</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#B0B0B0] hover:text-white smooth-transition">
              Features
            </a>
            <a href="#videos" className="text-[#B0B0B0] hover:text-white smooth-transition">
              Resources
            </a>
            <a href="#news" className="text-[#B0B0B0] hover:text-white smooth-transition">
              News
            </a>
          </nav>
          <Link to="/login">
            <Button className="bg-[#FFD700] hover:bg-yellow-500 text-[#0B0B0B] font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center min-h-[550px]">
            {/* Left Content */}
            <div className="flex flex-col justify-center order-2 md:order-1">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-[#111111] rounded-full border border-[#1A1A1A] w-fit">
                <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-[#B0B0B0]">JAMB 2025 Preparation</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4 leading-tight">
                Personalized
                <span className="text-[#FFD700] block">Learning Path</span>
              </h1>

              <p className="text-lg text-[#B0B0B0] mb-8 max-w-md leading-relaxed">
                Master any subject with our adaptive learning system. Get personalized recommendations, track your progress, and ace JAMB with confidence.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/login">
                  <Button className="bg-[#FFD700] hover:bg-yellow-500 text-[#0B0B0B] font-bold text-base px-8 py-3 h-auto">
                    Start Learning
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 font-bold text-base px-8 py-3 h-auto">
                    Explore Features
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#1A1A1A]">
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-[#FFD700]">500+</p>
                  <p className="text-xs md:text-sm text-[#B0B0B0] mt-1">Questions</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-[#FFD700]">12K+</p>
                  <p className="text-xs md:text-sm text-[#B0B0B0] mt-1">Students</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-[#FFD700]">95%</p>
                  <p className="text-xs md:text-sm text-[#B0B0B0] mt-1">Pass Rate</p>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative h-[450px] md:h-[550px] order-1 md:order-2 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#FFD700]/20 via-transparent to-transparent z-10"></div>
              <img
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=700&fit=crop&q=80"
                alt="Student learning with book and backpack"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-transparent opacity-40 z-5"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-[#111111] border-y border-[#1A1A1A] py-20 md:py-32">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4 text-center">Why Choose MEEKAH?</h2>
          <p className="text-center text-[#B0B0B0] mb-16 max-w-2xl mx-auto">
            Everything you need to prepare seriously for JAMB, nothing you don't.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-[#0B0B0B] border border-[#1A1A1A] rounded-xl p-8 hover:border-[#FFD700] smooth-transition group"
                >
                  <div className="w-12 h-12 bg-[#1A1A1A] group-hover:bg-[#FFD700] rounded-lg flex items-center justify-center mb-4 smooth-transition">
                    <Icon className="h-6 w-6 text-[#FFD700] group-hover:text-[#0B0B0B] smooth-transition" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-[#B0B0B0]">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">Learning Resources</h2>
          <p className="text-[#B0B0B0] mb-16">Expert-crafted video tutorials to guide your preparation</p>

          <div className="grid md:grid-cols-4 gap-6">
            {loadingVideos ? (
              <p className="col-span-full text-[#B0B0B0]">Loading videos...</p>
            ) : (
              videos.map((video) => (
                <a
                  key={video.id}
                  href={`https://youtube.com/watch?v=${video.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden hover-lift group cursor-pointer"
                >
                  <div className="aspect-video bg-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
                    <img
                      src={video.thumbnail_url || getYoutubeThumbnail(video.video_id)}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 smooth-transition"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 smooth-transition">
                      <div className="w-16 h-16 bg-[#FFD700] rounded-full flex items-center justify-center group-hover:scale-110 smooth-transition">
                        <Play className="h-8 w-8 text-[#0B0B0B] ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-[#0B0B0B]/90 px-2 py-1 rounded text-xs font-semibold text-[#FFD700]">
                      {formatDuration(video.duration_seconds)}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-sm group-hover:text-[#FFD700] smooth-transition line-clamp-2">{video.title}</p>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="bg-[#111111] border-y border-[#1A1A1A] py-20 md:py-32">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">Latest Updates</h2>
          <p className="text-[#B0B0B0] mb-16">Stay informed with JAMB news and preparation tips</p>

          <div className="grid md:grid-cols-3 gap-8">
            {loadingPosts ? (
              <p className="col-span-full text-[#B0B0B0]">Loading posts...</p>
            ) : (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-[#0B0B0B] border border-[#1A1A1A] rounded-xl p-6 hover:border-[#FFD700] smooth-transition group cursor-pointer"
                >
                  <div className="mb-4">
                    {post.featured_image && (
                      <div className="w-full h-40 bg-[#1A1A1A] rounded-lg mb-4 overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 smooth-transition"
                        />
                      </div>
                    )}
                    {!post.featured_image && (
                      <div className="w-full h-40 bg-[#1A1A1A] rounded-lg mb-4 group-hover:bg-[#FFD700]/10 smooth-transition"></div>
                    )}
                    <p className="text-xs text-[#B0B0B0] font-medium mb-2">{formatDate(post.created_at)}</p>
                    <h3 className="text-lg font-bold group-hover:text-[#FFD700] smooth-transition line-clamp-2">{post.title}</h3>
                  </div>
                  <p className="text-sm text-[#B0B0B0] mb-4 line-clamp-2">{post.excerpt || post.content.substring(0, 100)}</p>
                  <a href="#" className="inline-flex items-center gap-2 text-[#FFD700] font-semibold text-sm hover:gap-3 smooth-transition">
                    Read More <ArrowRight className="h-4 w-4" />
                  </a>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-[#111111] to-[#0B0B0B] border-t border-[#1A1A1A] py-20 md:py-32">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
            Ready to Master JAMB?
          </h2>
          <p className="text-xl text-[#B0B0B0] mb-8 max-w-2xl mx-auto">
            Join thousands of students who've already improved their JAMB scores with MEEKAH.
          </p>
          <Link to="/login">
            <Button className="bg-[#FFD700] hover:bg-yellow-500 text-[#0B0B0B] font-bold text-lg px-10 py-3 h-auto">
              Start Your Journey Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] bg-[#0B0B0B] py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-[#0B0B0B]" />
                </div>
                <span className="font-heading font-bold text-[#FFD700]">MEEKAH</span>
              </Link>
              <p className="text-[#B0B0B0] text-sm">Premium JAMB preparation platform</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-[#B0B0B0] text-sm">
                <li><a href="#features" className="hover:text-[#FFD700] smooth-transition">Features</a></li>
                <li><a href="#videos" className="hover:text-[#FFD700] smooth-transition">Resources</a></li>
                <li><a href="#news" className="hover:text-[#FFD700] smooth-transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-[#B0B0B0] text-sm">
                <li><a href="#" className="hover:text-[#FFD700] smooth-transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-[#FFD700] smooth-transition">FAQ</a></li>
                <li><a href="#" className="hover:text-[#FFD700] smooth-transition">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#111111] rounded-lg flex items-center justify-center text-[#B0B0B0] hover:bg-[#FFD700] hover:text-[#0B0B0B] smooth-transition"
                  title="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#111111] rounded-lg flex items-center justify-center text-[#B0B0B0] hover:bg-[#FFD700] hover:text-[#0B0B0B] smooth-transition"
                  title="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#111111] rounded-lg flex items-center justify-center text-[#B0B0B0] hover:bg-[#FFD700] hover:text-[#0B0B0B] smooth-transition"
                  title="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#111111] rounded-lg flex items-center justify-center text-[#B0B0B0] hover:bg-[#FFD700] hover:text-[#0B0B0B] smooth-transition"
                  title="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1A1A1A] pt-8 flex flex-col sm:flex-row justify-between items-center text-[#B0B0B0] text-sm">
            <p>&copy; 2025 MEEKAH. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="hover:text-[#FFD700] smooth-transition">Terms</a>
              <a href="#" className="hover:text-[#FFD700] smooth-transition">Privacy</a>
              <a href="#" className="hover:text-[#FFD700] smooth-transition">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp />
    </div>
  );
};

export default Landing;
