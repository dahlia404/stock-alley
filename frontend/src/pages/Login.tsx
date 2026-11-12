import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { KeyRound, LogIn, Sparkles } from "lucide-react";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { errorMessage, useSettings } from "@/lib/hooks";
import type { LoginRequest, Me } from "@/lib/types";
import Brand from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HERO = "https://images.unsplash.com/photo-1793341153773-b7987e7f1e8a?crop=entropy&cs=srgb&fm=jpg&w=1200&q=75";

export default function Login() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [form, setForm] = useState<LoginRequest>({ username: "", password: "" });

  const login = useMutation({
    mutationFn: (body: LoginRequest) => apiPost<Me>("/auth/login", body),
    onSuccess: () => {
      beginSession();
      navigate("/", { replace: true });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(form);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={HERO} alt="Stand de artist alley" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/85 via-indigo-800/60 to-pink-600/50" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            <Sparkles className="size-4" /> Artist Alley
          </span>
          <h1 className="max-w-md text-5xl font-extrabold leading-tight tracking-tight">
            Tu stand, bajo control.
          </h1>
          <p className="mt-4 max-w-md text-lg text-indigo-100">
            Chapas, prints y stickers: vende con un toque, recibe avisos de pocas unidades y consulta las ventas del día.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
          data-testid="login-form"
        >
          <div className="space-y-3">
            <Brand storeName={settings.store_name} logoUrl={settings.logo_url} size="lg" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inicia sesión</h2>
            <p className="text-sm text-muted-foreground">Accede al panel de stock de tu stand.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="h-11"
                data-testid="login-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-11"
                data-testid="login-password-input"
              />
            </div>
          </div>

          {login.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" data-testid="login-error-message">
              {errorMessage(login.error)}
            </p>
          )}

          <Button type="submit" className="h-11 w-full text-base" disabled={login.isPending} data-testid="login-submit-button">
            <LogIn /> {login.isPending ? "Entrando…" : "Entrar"}
          </Button>

          <div className="flex items-center justify-between rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-900">
            <span className="flex items-center gap-2">
              <KeyRound className="size-4" /> Por defecto: <b>admin</b> / <b>1234</b>
            </span>
            <button
              type="button"
              className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
              onClick={() => setForm({ username: "admin", password: "1234" })}
              data-testid="login-fill-default-button"
            >
              Rellenar
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
