"""Caja rápida: quote a cart (with per-type packs) and commit it as one ticket."""

from collections import defaultdict
from typing import Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.dates import today_iso
from lib.db import db
from models.schemas import (
    CartItem,
    CheckoutRequest,
    Movement,
    OkResponse,
    PackApplied,
    PackRule,
    PackUse,
    Product,
    Quote,
    QuoteLine,
    QuoteRequest,
    Ticket,
    now_utc,
)
from routers.settings import load_settings

router = APIRouter(tags=["checkout"], dependencies=[Depends(require_auth)])


def _apply_packs(lines: List[QuoteLine], rules: List[PackRule]) -> PackApplied | None:
    """Cheapest price for the units of one type. Packs cover the most expensive units first
    (best for the customer); the pack cost is spread over those units proportionally."""
    units: List[Tuple[float, int]] = sorted(
        ((l.unit_price, i) for i, l in enumerate(lines) for _ in range(l.qty)), reverse=True
    )
    n = len(units)
    inf = float("inf")
    dp = [0.0] + [inf] * n  # dp[k] = cheapest cost to cover exactly k units with packs
    choice: List[PackRule | None] = [None] * (n + 1)
    for k in range(1, n + 1):
        for r in rules:
            if r.qty <= k and dp[k - r.qty] + r.price < dp[k]:
                dp[k] = dp[k - r.qty] + r.price
                choice[k] = r

    prices = [u[0] for u in units]
    best_k, best_cost = 0, sum(prices)
    for k in range(1, n + 1):
        if dp[k] < inf and dp[k] + sum(prices[k:]) < best_cost - 1e-9:
            best_k, best_cost = k, dp[k] + sum(prices[k:])
    if best_k == 0:
        return None

    used: Dict[Tuple[int, float], int] = defaultdict(int)
    k = best_k
    while k > 0:
        r = choice[k]
        assert r is not None
        used[(r.qty, r.price)] += 1
        k -= r.qty

    covered_by_line: Dict[int, float] = defaultdict(float)
    for price, idx in units[:best_k]:
        covered_by_line[idx] += price
    covered_value = sum(covered_by_line.values())
    pack_cost = dp[best_k]

    for idx, line in enumerate(lines):
        cov = covered_by_line.get(idx, 0.0)
        share = pack_cost * cov / covered_value if covered_value else 0.0
        line.total = round(line.subtotal - cov + share, 2)
    # fix cent rounding so the type total is exact
    diff = round(round(best_cost, 2) - sum(l.total for l in lines), 2)
    if diff:
        lines[-1].total = round(lines[-1].total + diff, 2)

    return PackApplied(
        type=lines[0].product_type,
        uses=[PackUse(qty=q, price=p, times=t) for (q, p), t in sorted(used.items())],
        saving=round(sum(l.subtotal for l in lines) - best_cost, 2),
    )


async def build_quote(items: List[CartItem]) -> Quote:
    settings = await load_settings()
    qty_by_id: Dict[str, int] = defaultdict(int)
    for it in items:
        qty_by_id[it.product_id] += it.qty

    docs = await db.products.find({"id": {"$in": list(qty_by_id)}}).to_list(1000)
    products = {d["id"]: Product(**d) for d in docs}

    errors: List[str] = []
    lines: List[QuoteLine] = []
    for pid, qty in qty_by_id.items():
        p = products.get(pid)
        if not p:
            errors.append("Un producto del carrito ya no existe")
            continue
        if qty > p.stock:
            errors.append(f"Solo quedan {p.stock} de {p.name}")
        sub = round(p.price * qty, 2)
        lines.append(
            QuoteLine(
                product_id=pid, product_name=p.name, product_type=p.type, product_fandom=p.fandom,
                qty=qty, unit_price=p.price, subtotal=sub, total=sub, stock=p.stock,
            )
        )

    rules_by_type: Dict[str, List[PackRule]] = defaultdict(list)
    for r in settings.packs:
        rules_by_type[r.type].append(r)

    packs: List[PackApplied] = []
    for type_, rules in rules_by_type.items():
        tlines = [l for l in lines if l.product_type == type_]
        if tlines:
            applied = _apply_packs(tlines, rules)
            if applied:
                packs.append(applied)

    subtotal = round(sum(l.subtotal for l in lines), 2)
    total = round(sum(l.total for l in lines), 2)
    return Quote(lines=lines, packs=packs, subtotal=subtotal, discount=round(subtotal - total, 2), total=total, errors=errors)


@router.post("/checkout/quote", response_model=Quote)
async def quote(body: QuoteRequest):
    return await build_quote(body.items)


@router.post("/checkout", response_model=Ticket)
async def checkout(body: CheckoutRequest):
    if not body.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    settings = await load_settings()
    if body.payment_method not in settings.payment_methods:
        raise HTTPException(status_code=400, detail="Método de pago no aceptado")
    q = await build_quote(body.items)
    if q.errors:
        raise HTTPException(status_code=400, detail=q.errors[0])
    if body.cash_received is not None and body.cash_received + 1e-9 < q.total:
        raise HTTPException(status_code=400, detail="El importe entregado es menor que el total")

    done: List[QuoteLine] = []
    for line in q.lines:
        res = await db.products.update_one(
            {"id": line.product_id, "stock": {"$gte": line.qty}},
            {"$inc": {"stock": -line.qty, "sold_total": line.qty}, "$set": {"updated_at": now_utc()}},
        )
        if res.modified_count == 0:
            for d in done:  # roll back what was already taken
                await db.products.update_one({"id": d.product_id}, {"$inc": {"stock": d.qty, "sold_total": -d.qty}})
            raise HTTPException(status_code=400, detail=f"Stock insuficiente de {line.product_name}")
        done.append(line)

    day = today_iso(settings.timezone)
    ticket = Ticket(
        date=day,
        lines=q.lines,
        packs=q.packs,
        subtotal=q.subtotal,
        discount=q.discount,
        total=q.total,
        payment_method=body.payment_method,
        cash_received=body.cash_received,
        change=round(body.cash_received - q.total, 2) if body.cash_received is not None else None,
    )
    pack_types = {p.type for p in q.packs}
    movements = [
        Movement(
            product_id=l.product_id, product_name=l.product_name, product_type=l.product_type,
            product_fandom=l.product_fandom, kind="sale", qty=l.qty,
            unit_price=round(l.total / l.qty, 2), total=l.total,
            note="Caja · precio pack" if l.product_type in pack_types and l.total < l.subtotal else "Caja",
            payment_method=body.payment_method, ticket_id=ticket.id, date=day, created_at=ticket.created_at,
        )
        for l in q.lines
    ]
    await db.movements.insert_many([m.model_dump() for m in movements])
    await db.tickets.insert_one(ticket.model_dump())
    return ticket


@router.post("/tickets/{ticket_id}/void", response_model=OkResponse)
async def void_ticket(ticket_id: str):
    doc = await db.tickets.find_one({"id": ticket_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    t = Ticket(**doc)
    for l in t.lines:
        await db.products.update_one(
            {"id": l.product_id}, {"$inc": {"stock": l.qty, "sold_total": -l.qty}, "$set": {"updated_at": now_utc()}}
        )
    await db.movements.delete_many({"ticket_id": ticket_id})
    await db.tickets.delete_one({"id": ticket_id})
    return OkResponse()
