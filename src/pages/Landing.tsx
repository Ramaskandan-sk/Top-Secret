import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Clock, Tag, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Lock,
      title: "Encrypted Storage",
      description: "Your API keys are encrypted at rest using industry-standard encryption.",
    },
    {
      icon: Eye,
      title: "Secure Reveals",
      description: "Re-authenticate before revealing secrets with full audit logging.",
    },
    {
      icon: Clock,
      title: "Expiration Management",
      description: "Set expiration dates and get notified before keys expire.",
    },
    {
      icon: Tag,
      title: "Smart Organization",
      description: "Tag and categorize keys by project, environment, or custom labels.",
    },
    {
      icon: Search,
      title: "Powerful Search",
      description: "Find keys instantly with advanced filtering and search.",
    },
    {
      icon: Shield,
      title: "Audit Trail",
      description: "Complete activity logs for every key access and modification.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container relative mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Shield className="h-5 w-5 text-primary glow-primary" />
              <span className="text-sm font-medium text-primary">Secure API Key Management</span>
            </div>
            
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Manage Your API Keys
              <br />
              <span className="text-primary">Top Secret</span>
            </h1>
            
            <p className="mb-10 text-xl text-muted-foreground">
              Store, organize, and secure your API keys with enterprise-grade encryption.
              Never lose track of your credentials again.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="glow-primary-hover transition-all"
                onClick={() => navigate("/auth")}
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Enterprise-Grade Security</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to manage API keys securely
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-surface-elevated"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to secure your API keys?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join developers who trust Top Secret for their credential management
            </p>
            <Button
              size="lg"
              className="glow-primary-hover"
              onClick={() => navigate("/auth")}
            >
              Start Managing Keys
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
