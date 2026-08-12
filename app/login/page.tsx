"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";
import { t } from "@/lib/translations";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(t.auth.wrongPin);
        setPin("");
      }
    } catch {
      setError(t.auth.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Store className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">🏪 {t.appName}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t.auth.enterPin}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl tracking-widest h-14"
              maxLength={6}
              autoFocus
              required
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={loading || !pin}
            >
              {loading ? t.auth.checking : `🔓 ${t.auth.unlock}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
