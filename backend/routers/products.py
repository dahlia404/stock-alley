from typing import List

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.dates import today_iso
from lib.db import db
from models.schemas import (
    Movement,
    OkResponse,
    Product,
    ProductCreate,
    ProductUpdate,
    StockChange,
    StockChangeResult,
    now_utc,
)
from routers.settings import load_settings

router = APIRouter(tags=["products"], dependencies=[Depends(require_auth)])


async def get_product_or_404(product_id: str) -> Product:
    doc = await db.products.find_one({"id": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return Product(**doc)


@router.get("/products", response_model=List[Product])
async def list_products():
    docs = await db.products.find().sort("name", 1).to_list(5000)
    return [Product(**d) for d in docs]


@router.post("/products", response_model=Product)
async def create_product(body: ProductCreate):
    product = Product(**body.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    return await get_product_or_404(product_id)


@router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, body: ProductUpdate):
    await get_product_or_404(product_id)
    await db.products.update_one(
        {"id": product_id}, {"$set": {**body.model_dump(), "updated_at": now_utc()}}
    )
    return await get_product_or_404(product_id)


@router.delete("/products/{product_id}", response_model=OkResponse)
async def delete_product(product_id: str):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return OkResponse()


@router.get("/products/{product_id}/movements", response_model=List[Movement])
async def product_movements(product_id: str):
    docs = await db.movements.find({"product_id": product_id}).sort("created_at", -1).to_list(200)
    return [Movement(**d) for d in docs]


@router.post("/products/{product_id}/stock", response_model=StockChangeResult)
async def change_stock(product_id: str, body: StockChange):
    product = await get_product_or_404(product_id)
    settings = await load_settings()

    if body.kind == "restock":
        await db.products.update_one(
            {"id": product_id}, {"$inc": {"stock": body.qty}, "$set": {"updated_at": now_utc()}}
        )
    else:
        inc = {"stock": -body.qty}
        if body.kind == "sale":
            inc["sold_total"] = body.qty
        # atomic guard: never let stock go negative
        res = await db.products.update_one(
            {"id": product_id, "stock": {"$gte": body.qty}},
            {"$inc": inc, "$set": {"updated_at": now_utc()}},
        )
        if res.modified_count == 0:
            raise HTTPException(
                status_code=400, detail=f"No hay stock suficiente (quedan {product.stock})"
            )

    unit_price = (body.unit_price if body.unit_price is not None else product.price) if body.kind == "sale" else 0
    movement = Movement(
        product_id=product.id,
        product_name=product.name,
        product_type=product.type,
        product_fandom=product.fandom,
        kind=body.kind,
        qty=body.qty,
        unit_price=unit_price,
        total=round(unit_price * body.qty, 2),
        note=body.note,
        date=today_iso(settings.timezone),
    )
    await db.movements.insert_one(movement.model_dump())
    return StockChangeResult(product=await get_product_or_404(product_id), movement=movement)
