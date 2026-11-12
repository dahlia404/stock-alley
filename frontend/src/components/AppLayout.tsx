import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BookOpen, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Settings, ShoppingCart } from "lucide-react";
import { ApiError, apiGet } from "@/lib/api";
import { endSession } from "@/lib/session";
import { useSettings } from "@/lib/hooks";
import type { Me } from "@/lib/types";
import Brand from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, testid: "nav-link-inicio" },
  { to: "/productos", label: "Productos", icon: Package, testid: "nav-link-productos" },
  { to: "/caja", label: "Caja", icon: ShoppingCart, testid: "nav-link-caja" },
  { to: "/ventas", label: "Ventas", icon: ReceiptText, testid: "nav-link-ventas" },
  { to: "/configuracion", label: "Configuración", icon: Settings, testid: "nav-link-configuracion" },
  { to: "/manual", label: "Manual", icon: BookOpen, testid: "nav-link-manual" },
];

function NavItems({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {NAV.map(({ to, label, icon: Icon, testid }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          data-testid={mobile ? `mobile-${testid}` : testid}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200",
              mobile && "py-3 text-base",
              isActive ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700",
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { settings } = useSettings();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<Me>("/auth/me"), retry: false });

  if (me.error instanceof ApiError && me.error.status === 401) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_#EEF2FF_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_right,_#FCE7F3_0%,_transparent_40%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center" data-testid="header-brand-link">
            <Brand storeName={settings.store_name} logoUrl={settings.logo_url} />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            <NavItems />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span data-testid="header-currency-pill" className="hidden rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600 sm:inline">
              {settings.currency}
            </span>
            <Button variant="ghost" size="sm" onClick={() => void endSession()} data-testid="logout-button" className="hidden sm:inline-flex">
              <LogOut /> Salir
            </Button>
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" data-testid="mobile-menu-button" aria-label="Menú" />}>
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="p-4">
                <SheetTitle className="mb-4 px-2">
                  <Brand storeName={settings.store_name} logoUrl={settings.logo_url} />
                </SheetTitle>
                <nav className="flex flex-col gap-1">
                  <NavItems mobile />
                </nav>
                <Button variant="outline" className="mt-6" onClick={() => void endSession()} data-testid="mobile-logout-button">
                  <LogOut /> Cerrar sesión
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* Wait for the session check; a non-401 failure (no backend) still renders the page. */}
          {me.isPending ? <p className="py-16 text-center text-slate-500">Cargando…</p> : <Outlet />}
        </motion.div>
      </main>
    </div>
  );
}
