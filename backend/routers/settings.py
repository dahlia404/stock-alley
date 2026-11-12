from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.db import db
from models.schemas import AppSettings

router = APIRouter(prefix="/settings", tags=["settings"])


async def load_settings() -> AppSettings:
    doc = await db.settings.find_one({"id": "main"})
    return AppSettings(**doc) if doc else AppSettings()


# Public: the login screen shows the logo / store name before authentication.
@router.get("", response_model=AppSettings)
async def get_settings():
    return await load_settings()


@router.put("", response_model=AppSettings, dependencies=[Depends(require_auth)])
async def update_settings(body: AppSettings):
    try:
        ZoneInfo(body.timezone)
    except Exception:
        raise HTTPException(status_code=400, detail="Zona horaria no válida")
    clean = body.model_copy(
        update={
            "store_name": body.store_name.strip(),
            "logo_url": body.logo_url or None,
            "product_types": list(dict.fromkeys(t.strip() for t in body.product_types if t.strip())),
            "fandoms": list(dict.fromkeys(f.strip() for f in body.fandoms if f.strip())),
            "payment_methods": list(dict.fromkeys(p.strip() for p in body.payment_methods if p.strip())),
        }
    )
    if not clean.payment_methods:
        raise HTTPException(status_code=400, detail="Debe haber al menos un método de pago")
    await db.settings.update_one({"id": "main"}, {"$set": clean.model_dump()}, upsert=True)
    return clean
