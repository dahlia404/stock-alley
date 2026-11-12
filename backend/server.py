import asyncio
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
from lib.db import client, ensure_indexes
from lib.auth import bootstrap
from routers import auth, checkout, products, sales, settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.index_task = asyncio.create_task(ensure_indexes())  # background: a big index build must not block boot
    try:
        await bootstrap()  # default admin/1234 + settings on first boot
    except Exception as exc:
        logger.error("bootstrap failed: %s", exc)
    yield
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()


app = FastAPI(lifespan=lifespan, title="AlleyStock API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "AlleyStock API OK"}


api_router.include_router(auth.router)
api_router.include_router(settings.router)
api_router.include_router(products.router)
api_router.include_router(sales.router)
api_router.include_router(checkout.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app (keep last)
app.include_router(api_router)
