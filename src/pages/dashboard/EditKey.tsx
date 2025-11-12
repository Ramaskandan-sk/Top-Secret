import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, encryptSecret, decryptSecret } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const keySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  provider: z.string().min(1, "Provider is required").max(100),
  environment: z.enum(["production", "development", "staging"]),
  secret: z.string().optional(),
  tags: z.string(),
  notes: z.string().max(1000),
  expires_at: z.string().optional(),
});

export default function EditKey() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState<any>(null);
  const [decryptedSecret, setDecryptedSecret] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    fetchKey();
  }, [id, user]);

  const fetchKey = async () => {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("id", id)
      .eq("user_id", user?.id)
      .single();

    if (error) {
      toast.error("Failed to fetch key");
      navigate("/dashboard/keys");
    } else {
      setKey(data);
      const decrypted = await decryptSecret(data.encrypted_secret);
      setDecryptedSecret(decrypted);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      provider: formData.get("provider") as string,
      environment: formData.get("environment") as string,
      secret: formData.get("secret") as string,
      tags: formData.get("tags") as string,
      notes: formData.get("notes") as string,
      expires_at: formData.get("expires_at") as string,
    };

    try {
      const validated = keySchema.parse(data);
      const tags = validated.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const updateData: any = {
        name: validated.name,
        provider: validated.provider,
        environment: validated.environment,
        tags,
        notes: validated.notes,
        expires_at: validated.expires_at || null,
      };

      // Only update secret if a new one is provided
      if (validated.secret && validated.secret !== decryptedSecret) {
        updateData.encrypted_secret = await encryptSecret(validated.secret);
      }

      const { error } = await supabase
        .from("api_keys")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Log the update
      await supabase.from("key_audit").insert({
        key_id: id,
        user_id: user?.id,
        action: "update",
        metadata: { 
          timestamp: new Date().toISOString(),
          secret_rotated: !!validated.secret && validated.secret !== decryptedSecret
        },
      });

      toast.success("API key updated successfully");
      navigate("/dashboard/keys");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to update API key");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!key) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/keys")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit API Key</h1>
          <p className="text-muted-foreground">Update key details</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Key Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={key.name}
                placeholder="e.g., OpenAI Production Key"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider *</Label>
                <Input
                  id="provider"
                  name="provider"
                  defaultValue={key.provider}
                  placeholder="e.g., OpenAI, Stripe, AWS"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment *</Label>
                <Select name="environment" defaultValue={key.environment} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret">Secret Value</Label>
              <Input
                id="secret"
                name="secret"
                type="password"
                placeholder="Leave blank to keep current secret"
              />
              <p className="text-xs text-muted-foreground">
                Only enter a new value if you want to rotate the secret
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={key.tags.join(", ")}
                placeholder="production, api, billing (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={key.notes || ""}
                placeholder="Additional information about this key..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="date"
                defaultValue={key.expires_at ? new Date(key.expires_at).toISOString().split('T')[0] : ""}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update API Key"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard/keys")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
