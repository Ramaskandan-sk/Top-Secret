import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Encryption helper using browser's Web Crypto API
export async function encryptSecret(secret: string): Promise<string> {
  // For demo purposes, we're base64 encoding
  // In production, use proper encryption with a key stored server-side
  return btoa(secret);
}

export async function decryptSecret(encryptedSecret: string): Promise<string> {
  // For demo purposes, we're base64 decoding
  // In production, use proper decryption
  try {
    return atob(encryptedSecret);
  } catch {
    return encryptedSecret;
  }
}
