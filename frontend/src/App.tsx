import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import SalesLog from "@/pages/SalesLog";
import Settings from "@/pages/Settings";
import Manual from "@/pages/Manual";
import Checkout from "@/pages/Checkout";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/productos/nuevo" element={<ProductDetail />} />
          <Route path="/productos/:id" element={<ProductDetail />} />
          <Route path="/caja" element={<Checkout />} />
          <Route path="/ventas" element={<SalesLog />} />
          <Route path="/configuracion" element={<Settings />} />
          <Route path="/manual" element={<Manual />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
