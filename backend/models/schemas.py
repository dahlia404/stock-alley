"""Pydantic v2 models. Every model has a hand-written TS twin in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import Annotated, List, Literal, Optional

from pydantic import AfterValidator, BaseModel, Field


def _aware(dt: datetime) -> datetime:
    # motor returns naive UTC datetimes; normalise so they serialise with an offset
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


AwareDT = Annotated[datetime, AfterValidator(_aware)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class Me(BaseModel):
    username: str


class CredentialsUpdate(BaseModel):
    current_password: str
    new_username: str = Field(min_length=1)
    new_password: str = Field(min_length=4)


class OkResponse(BaseModel):
    ok: bool = True


# ---------- Settings ----------
DEFAULT_TYPES = ["Chapa", "Print A4", "Print A5", "Sticker", "Stand acrílico", "Llavero", "Marcapáginas"]
DEFAULT_FANDOMS = ["Dragon Ball", "One Piece", "Naruto", "Genshin Impact", "Studio Ghibli", "Spy x Family", "Original"]
DEFAULT_PAYMENTS = ["Efectivo", "Tarjeta", "Bizum"]


class AppSettings(BaseModel):
    store_name: str = Field("Mi Stand", min_length=1)
    event_name: str = ""
    logo_url: Optional[str] = None
    currency: str = "EUR"
    low_stock_threshold: int = Field(3, ge=0)
    timezone: str = "Europe/Madrid"
    product_types: List[str] = Field(default_factory=lambda: list(DEFAULT_TYPES))
    fandoms: List[str] = Field(default_factory=lambda: list(DEFAULT_FANDOMS))
    payment_methods: List[str] = Field(default_factory=lambda: list(DEFAULT_PAYMENTS))
    packs: List["PackRule"] = Field(default_factory=list)


class PackRule(BaseModel):
    """'qty' units of any product of 'type' (designs can be mixed) cost 'price' in total."""
    id: str = Field(default_factory=new_id)
    type: str = Field(min_length=1)
    qty: int = Field(ge=2)
    price: float = Field(ge=0)


AppSettings.model_rebuild()


# ---------- Products ----------
class ProductBase(BaseModel):
    name: str = Field(min_length=1)
    type: str = ""
    fandom: str = ""
    price: float = Field(ge=0)
    image: Optional[str] = None
    notes: str = ""


class ProductCreate(ProductBase):
    stock: int = Field(0, ge=0)


class ProductUpdate(ProductBase):
    pass


class Product(ProductBase):
    id: str = Field(default_factory=new_id)
    stock: int = 0
    sold_total: int = 0
    created_at: AwareDT = Field(default_factory=now_utc)
    updated_at: AwareDT = Field(default_factory=now_utc)


# ---------- Stock movements ----------
MovementKind = Literal["sale", "restock", "adjust"]


class StockChange(BaseModel):
    kind: MovementKind
    qty: int = Field(1, ge=1)
    note: str = ""
    unit_price: Optional[float] = Field(None, ge=0)  # sale only; defaults to product price


class Movement(BaseModel):
    id: str = Field(default_factory=new_id)
    product_id: str
    product_name: str
    product_type: str = ""
    product_fandom: str = ""
    kind: MovementKind
    qty: int
    unit_price: float = 0
    total: float = 0
    note: str = ""
    payment_method: str = ""  # "" = venta rápida sin método indicado
    ticket_id: Optional[str] = None  # set when the sale came from the checkout (Caja)
    date: str  # YYYY-MM-DD in the configured timezone
    created_at: AwareDT = Field(default_factory=now_utc)


class StockChangeResult(BaseModel):
    product: Product
    movement: Movement


class SalesItem(BaseModel):
    product_id: str
    product_name: str
    product_type: str
    product_fandom: str
    qty: int
    revenue: float


# ---------- Checkout (Caja rápida) ----------
class CartItem(BaseModel):
    product_id: str
    qty: int = Field(ge=1)


class QuoteRequest(BaseModel):
    items: List[CartItem]


class QuoteLine(BaseModel):
    product_id: str
    product_name: str
    product_type: str
    product_fandom: str
    qty: int
    unit_price: float
    subtotal: float  # qty * unit_price
    total: float  # after pack discounts
    stock: int


class PackUse(BaseModel):
    qty: int
    price: float
    times: int


class PackApplied(BaseModel):
    type: str
    uses: List[PackUse]
    saving: float


class Quote(BaseModel):
    lines: List[QuoteLine]
    packs: List[PackApplied]
    subtotal: float
    discount: float
    total: float
    errors: List[str]


class CheckoutRequest(QuoteRequest):
    payment_method: str
    cash_received: Optional[float] = Field(None, ge=0)


class Ticket(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    created_at: AwareDT = Field(default_factory=now_utc)
    lines: List[QuoteLine]
    packs: List[PackApplied]
    subtotal: float
    discount: float
    total: float
    payment_method: str
    cash_received: Optional[float] = None
    change: Optional[float] = None


class PaymentSummary(BaseModel):
    method: str
    total: float
    sales: int


class SalesDay(BaseModel):
    date: str
    today: str
    total_units: int
    total_revenue: float
    restock_units: int
    adjust_units: int
    items: List[SalesItem]
    movements: List[Movement]
    tickets: List[Ticket]
    by_payment: List[PaymentSummary]
