"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setInfo(
        "登録しました。Supabase の SQL Editor で以下を実行してメール確認をスキップしてください:\n\nupdate auth.users set email_confirmed_at = now() where email = '" +
          email +
          "';\n\nその後ログインタブに切り替えてサインインしてください。"
      );
      setMode("signin");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/calendar");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Fire Fit Gym</h1>
          <p className="text-sm text-muted-foreground">
            パーソナルジム顧客・セッション・売上管理
          </p>
        </div>

        <div className="flex gap-1 bg-muted rounded-md p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 h-8 rounded text-sm font-medium ${
              mode === "signin"
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 h-8 rounded text-sm font-medium ${
              mode === "signup"
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={submitPassword} className="space-y-3">
          <div>
            <Label htmlFor="email">メール</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? "処理中…"
              : mode === "signin"
                ? "ログイン"
                : "登録"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">
              または
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full"
        >
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.29 1.5-1.14 2.77-2.4 3.62v3h3.87c2.26-2.09 3.58-5.17 3.58-8.86z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09C3.25 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.27C.46 8.24 0 10.06 0 12s.46 3.76 1.27 5.38l4-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75z"
            />
          </svg>
          Googleでログイン
        </Button>

        {error && <p className="text-sm text-danger">{error}</p>}
        {info && (
          <pre className="text-xs text-muted-foreground bg-muted rounded p-3 whitespace-pre-wrap font-mono">
            {info}
          </pre>
        )}

        <p className="text-xs text-muted-foreground text-center">
          初回ログイン時はスタッフ権限で登録されます。
        </p>
      </Card>
    </main>
  );
}
