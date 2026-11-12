import re
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.dates import today_iso
from lib.db import db
from models.schemas import (
    Movement,
    PaymentSummary,
    Product,
    SalesDay,
    SalesItem,
    StockChangeResult,
    Ticket,
    now_utc,
)
from routers.settings import load_settings

router = APIRouter(tags=["sales"], dependencies=[Depends(require_auth)])

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.get("/sales", response_model=SalesDay)
async def sales_day(date: Optional[str] = None):
    settings = await load_settings()
    today = today_iso(settings.timezone)
    day = date or today
    if not DATE_RE.match(day):
        raise HTTPException(status_code=400, detail="Fecha no válida (usa AAAA-MM-DD)")

    docs = await db.movements.find({"date": day}).sort("created_at", -1).to_list(10000)
    movements = [Movement(**d) for d in docs]

    items: dict[str, SalesItem] = {}
    for m in movements:
        if m.kind != "sale":
            continue
        item = items.get(m.product_id)
        if not item:
            item = items[m.product_id] = SalesItem(
                product_id=m.product_id,
                product_name=m.product_name,
                product_type=m.product_type,
                product_fandom=m.product_fandom,
                qty=0,
                revenue=0,
            )
        item.qty += m.qty
        item.revenue = round(item.revenue + m.total, 2)

    sales = [m for m in movements if m.kind == "sale"]

    # payment breakdown: a checkout ticket counts as one sale, each quick sale as one
    pay_total: dict[str, float] = defaultdict(float)
    pay_sales: dict[str, set] = defaultdict(set)
    for m in sales:
        method = m.payment_method or "Sin especificar"
        pay_total[method] += m.total
        pay_sales[method].add(m.ticket_id or m.id)
    by_payment = sorted(
        (PaymentSummary(method=k, total=round(v, 2), sales=len(pay_sales[k])) for k, v in pay_total.items()),
        key=lambda p: -p.total,
    )
    tdocs = await db.tickets.find({"date": day}).sort("created_at", -1).to_list(5000)

    return SalesDay(
        tickets=[Ticket(**t) for t in tdocs],
        by_payment=by_payment,
        date=day,
        today=today,
        total_units=sum(m.qty for m in sales),
        total_revenue=round(sum(m.total for m in sales), 2),
        restock_units=sum(m.qty for m in movements if m.kind == "restock"),
        adjust_units=sum(m.qty for m in movements if m.kind == "adjust"),
        items=sorted(items.values(), key=lambda i: (-i.qty, i.product_name)),
        movements=movements,
    )


@router.post("/movements/{movement_id}/undo", response_model=StockChangeResult)
async def undo_movement(movement_id: str):
    doc = await db.movements.find_one({"id": movement_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    m = Movement(**doc)
    if m.ticket_id:
        raise HTTPException(status_code=400, detail="Esta venta es de un ticket de caja: anula el ticket completo")

    if m.kind == "restock":
        res = await db.products.update_one(
            {"id": m.product_id, "stock": {"$gte": m.qty}},
            {"$inc": {"stock": -m.qty}, "$set": {"updated_at": now_utc()}},
        )
        if res.matched_count == 0 and await db.products.find_one({"id": m.product_id}):
            raise HTTPException(status_code=400, detail="No se puede deshacer: el stock quedaría negativo")
    else:
        inc = {"stock": m.qty}
        if m.kind == "sale":
            inc["sold_total"] = -m.qty
        await db.products.update_one({"id": m.product_id}, {"$inc": inc, "$set": {"updated_at": now_utc()}})

    await db.movements.delete_one({"id": movement_id})
    pdoc = await db.products.find_one({"id": m.product_id})
    if not pdoc:
        raise HTTPException(status_code=404, detail="El producto ya no existe")
    return StockChangeResult(product=Product(**pdoc), movement=m)
