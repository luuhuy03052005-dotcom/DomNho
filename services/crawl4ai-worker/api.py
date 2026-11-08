from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from crawler_engine import PROVIDER, crawl_rescue_posts, scrape_rescue_url

app = FastAPI(title="Đốm Nhỏ Crawl4AI Worker", version="1.0.0")


class CrawlPayload(BaseModel):
    targetPlatform: str = "ALL"
    customUrls: list[str] = Field(default_factory=list)
    excludeUrls: list[str] = Field(default_factory=list)
    perQueryLimit: int = 10
    minimumSpots: int = 0
    maxSpots: int = 100
    concurrency: int = 4


class ScrapePayload(BaseModel):
    url: str
    note: str = ""


def verify_token(authorization: str | None = Header(default=None)) -> None:
    configured = os.getenv("CRAWL4AI_WORKER_TOKEN", "").strip()
    if not configured:
        raise HTTPException(status_code=503, detail="CRAWL4AI_WORKER_TOKEN is not configured")
    if authorization != f"Bearer {configured}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "provider": PROVIDER}


@app.post("/crawl", dependencies=[Depends(verify_token)])
async def crawl(payload: CrawlPayload) -> dict[str, Any]:
    try:
        return {"ok": True, **await crawl_rescue_posts(payload.model_dump())}
    except RuntimeError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/scrape", dependencies=[Depends(verify_token)])
async def scrape(payload: ScrapePayload) -> dict[str, Any]:
    return {"ok": True, "spot": await scrape_rescue_url(payload.url, payload.note)}
