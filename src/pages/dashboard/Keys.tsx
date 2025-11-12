import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, EyeOff, Copy, Edit, Trash2, Key as KeyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase, decryptSecret } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  environment: string;
  encrypted_secret: string;
  tags: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export default function Keys() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [revealDialog, setRevealDialog] = useState<{
    open: boolean;
    keyId: string | null;
    password: string;
  }>({ open: false, keyId: null, password: "" });
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user?.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch keys");
    } else {
      setKeys(data || []);
    }
    setLoading(false);
  };

  const handleReveal = async (keyId: string) => {
    setRevealDialog({ open: true, keyId, password: "" });
  };

  const confirmReveal = async () => {
    if (!revealDialog.keyId) return;

    // Re-authenticate user
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: revealDialog.password,
    });

    if (authError) {
      toast.error("Incorrect password");
      return;
    }

    const key = keys.find(k => k.id === revealDialog.keyId);
    if (!key) return;

    const decrypted = await decryptSecret(key.encrypted_secret);
    setRevealedSecrets(prev => ({ ...prev, [key.id]: decrypted }));

    // Log the reveal
    await supabase.from("key_audit").insert({
      key_id: key.id,
      user_id: user?.id,
      action: "reveal",
      metadata: { timestamp: new Date().toISOString() },
    });

    toast.success("Secret revealed");
    setRevealDialog({ open: false, keyId: null, password: "" });
  };

  const handleCopy = async (keyId: string, secret: string) => {
    await navigator.clipboard.writeText(secret);
    
    // Log the copy
    await supabase.from("key_audit").insert({
      key_id: keyId,
      user_id: user?.id,
      action: "copy",
      metadata: { timestamp: new Date().toISOString() },
    });

    toast.success("Copied to clipboard");
  };

  const handleDelete = async (keyId: string) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_deleted: true })
      .eq("id", keyId);

    if (error) {
      toast.error("Failed to delete key");
    } else {
      toast.success("Key deleted");
      fetchKeys();
    }
    setDeleteKey(null);
  };

  const filteredKeys = keys.filter(
    (key) =>
      key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return "••••••••";
    return secret.substring(0, 4) + "••••••••" + secret.substring(secret.length - 4);
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "production": return "destructive";
      case "staging": return "default";
      case "development": return "secondary";
      default: return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your stored API keys</p>
        </div>
        <Button onClick={() => navigate("/dashboard/keys/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Key
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, provider, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredKeys.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <KeyIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No API keys found</h3>
            <p className="mb-4 text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Get started by adding your first API key"}
            </p>
            {!searchTerm && (
              <Button onClick={() => navigate("/dashboard/keys/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Key
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Secret</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>{key.provider}</TableCell>
                  <TableCell>
                    <Badge variant={getEnvironmentColor(key.environment)}>
                      {key.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {revealedSecrets[key.id] || maskSecret(key.encrypted_secret)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {key.tags.slice(0, 2).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {key.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{key.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(key.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {revealedSecrets[key.id] ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const newRevealed = { ...revealedSecrets };
                              delete newRevealed[key.id];
                              setRevealedSecrets(newRevealed);
                            }}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopy(key.id, revealedSecrets[key.id])}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleReveal(key.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => navigate(`/dashboard/keys/${key.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Reveal Dialog */}
      <Dialog open={revealDialog.open} onOpenChange={(open) => !open && setRevealDialog({ open: false, keyId: null, password: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Identity</DialogTitle>
            <DialogDescription>
              Enter your password to reveal this secret. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={revealDialog.password}
                onChange={(e) => setRevealDialog(prev => ({ ...prev, password: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && confirmReveal()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRevealDialog({ open: false, keyId: null, password: "" })}>
                Cancel
              </Button>
              <Button onClick={confirmReveal}>Reveal Secret</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this API key. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteKey && handleDelete(deleteKey)} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
