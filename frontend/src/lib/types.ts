// Hand-written mirrors of backend/models/schemas.py — keep in sync.

export interface Me {
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CredentialsUpdate {
  current_password: string;
  new_username: string;
  new_password: string;
}

export interface OkResponse {
  ok: boolean;
}

export interface AppSettings {
  store_name: string;
  event_name: string;
  logo_url: string | null;
  currency: string;
  low_stock_threshold: number;
  timezone: string;
  product_types: string[];
  fandoms: string[];
  payment_methods: string[];
  packs: PackRule[];
}

export interface PackRule {
  id: string;
  type: string;
  qty: number;
  price: number;
}

export interface ProductBase {
  name: string;
  type: string;
  fandom: string;
  price: number;
  image: string | null;
  notes: string;
}

export interface ProductCreate extends ProductBase {
  stock: number;
}

export type ProductUpdate = ProductBase;

export interface Product extends ProductBase {
  id: string;
  stock: number;
  sold_total: number;
  created_at: string;
  updated_at: string;
}

export type MovementKind = "sale" | "restock" | "adjust";

export interface StockChange {
  kind: MovementKind;
  qty: number;
  note?: string;
  unit_price?: number | null;
}

export interface Movement {
  id: string;
  product_id: string;
  product_name: string;
  product_type: string;
  product_fandom: string;
  kind: MovementKind;
  qty: number;
  unit_price: number;
  total: number;
  note: string;
  payment_method: string;
  ticket_id: string | null;
  date: string;
  created_at: string;
}

export interface StockChangeResult {
  product: Product;
  movement: Movement;
}

export interface SalesItem {
  product_id: string;
  product_name: string;
  product_type: string;
  product_fandom: string;
  qty: number;
  revenue: number;
}

export interface SalesDay {
  date: string;
  today: string;
  total_units: number;
  total_revenue: number;
  restock_units: number;
  adjust_units: number;
  items: SalesItem[];
  movements: Movement[];
  tickets: Ticket[];
  by_payment: PaymentSummary[];
}

export interface CartItem {
  product_id: string;
  qty: number;
}

export interface QuoteRequest {
  items: CartItem[];
}

export interface QuoteLine {
  product_id: string;
  product_name: string;
  product_type: string;
  product_fandom: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  total: number;
  stock: number;
}

export interface PackUse {
  qty: number;
  price: number;
  times: number;
}

export interface PackApplied {
  type: string;
  uses: PackUse[];
  saving: number;
}

export interface Quote {
  lines: QuoteLine[];
  packs: PackApplied[];
  subtotal: number;
  discount: number;
  total: number;
  errors: string[];
}

export interface CheckoutRequest extends QuoteRequest {
  payment_method: string;
  cash_received: number | null;
}

export interface Ticket {
  id: string;
  date: string;
  created_at: string;
  lines: QuoteLine[];
  packs: PackApplied[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  cash_received: number | null;
  change: number | null;
}

export interface PaymentSummary {
  method: string;
  total: number;
  sales: number;
}
