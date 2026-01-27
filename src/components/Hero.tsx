import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Now available for everyone
          </div>
          
          {/* Headline */}
          <h1 
            className="text-5xl md:text-7xl font-extrabold text-white leading-tight text-balance opacity-0 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            Build something{" "}
            <span className="text-accent">amazing</span>{" "}
            today
          </h1>
          
          {/* Subheadline */}
          <p 
            className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto text-balance opacity-0 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            The modern platform for creators, developers, and dreamers. 
            Start your journey with tools designed for the future.
          </p>
          
          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button variant="hero" size="lg">
              Get Started Free
              <ArrowRight className="ml-1" />
            </Button>
            <Button variant="hero-outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
