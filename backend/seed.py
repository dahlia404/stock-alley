"""Optional demo data. Run: cd backend && python seed.py
Idempotent: only inserts demo products when the catalogue is empty."""

import asyncio

from lib.auth import bootstrap
from lib.db import db, ensure_indexes
from models.schemas import Product

IMG = "https://images.unsplash.com/photo-{}?crop=entropy&cs=srgb&fm=jpg&w=400&q=70"

DEMO = [
    ("Chapa Goku Ultra Instinto", "Chapa", "Dragon Ball", 2.5, 24, IMG.format("1607604276583-eef5d076aa5f")),
    ("Chapa Luffy Gear 5", "Chapa", "One Piece", 2.5, 2, None),
    ("Print A4 Thousand Sunny", "Print A4", "One Piece", 10, 8, IMG.format("1741980992295-0c0b69ba3b43")),
    ("Print A5 Equipo 7", "Print A5", "Naruto", 6, 0, None),
    ("Sticker Chibi Anya", "Sticker", "Spy x Family", 1.5, 40, IMG.format("1741980983820-cbfcf8fba790")),
    ("Sticker Paimon", "Sticker", "Genshin Impact", 1.5, 3, None),
    ("Stand acrílico Totoro", "Stand acrílico", "Studio Ghibli", 15, 5, None),
    ("Llavero Kakashi", "Llavero", "Naruto", 7, 1, None),
    ("Marcapáginas Original Gatito", "Marcapáginas", "Original", 3, 12, None),
]


async def main() -> None:
    await ensure_indexes()
    await bootstrap()
    if await db.products.count_documents({}) == 0:
        for name, type_, fandom, price, stock, image in DEMO:
            p = Product(name=name, type=type_, fandom=fandom, price=price, stock=stock, image=image)
            await db.products.insert_one(p.model_dump())
        print(f"Inserted {len(DEMO)} demo products")
    else:
        print("Products already exist; skipping demo data")


if __name__ == "__main__":
    asyncio.run(main())
