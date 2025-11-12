import { useEffect, useState } from "react";
import { Key, Eye, Plus, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalKeys: 0,
    recentlyUsed: 0,
    expiringSoon: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data: keys } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_deleted", false);

      if (keys) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        setStats({
          totalKeys: keys.length,
          recentlyUsed: keys.filter(k => {
            if (!k.last_used_at) return false;
            const lastUsed = new Date(k.last_used_at);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return lastUsed > sevenDaysAgo;
          }).length,
          expiringSoon: keys.filter(k => {
            if (!k.expires_at) return false;
            const expiresAt = new Date(k.expires_at);
            return expiresAt > now && expiresAt < thirtyDaysFromNow;
          }).length,
        });
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your API keys and activity</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKeys}</div>
            <p className="text-xs text-muted-foreground">Active API keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recently Used</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyUsed}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => navigate("/dashboard/keys/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Key
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/keys")}>
            <Key className="mr-2 h-4 w-4" />
            View All Keys
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
