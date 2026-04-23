from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, schemas
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=schemas.NotificationLog)
async def create_notification(
    notification_in: schemas.NotificationLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """알림 로그 생성 (현재 사용자 정보 자동 주입)"""
    # 클라이언트가 user 정보를 안 보내면 JWT에서 자동 채움
    data = notification_in.model_dump()
    if not data.get('user_id'):
        data['user_id'] = current_user.id
    if not data.get('username'):
        data['username'] = current_user.username
    enriched = schemas.NotificationLogCreate(**data)
    return await crud.notification_log.create_notification_log(db, enriched)

@router.get("/", response_model=schemas.NotificationLogListResponse)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=2000),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="제목/메시지/장비명 텍스트 검색"),
    date_from: Optional[str] = Query(None, description="시작 날짜 (ISO 형식: 2024-01-01T00:00:00)"),
    date_to: Optional[str] = Query(None, description="종료 날짜 (ISO 형식: 2024-12-31T23:59:59)"),
    db: AsyncSession = Depends(get_db)
):
    """알림 로그 목록 조회"""
    logs, total = await crud.notification_log.get_notification_logs(
        db, skip=skip, limit=limit, category=category, type=type,
        search=search, date_from=date_from, date_to=date_to,
    )

    return {
        "items": logs,
        "total": total
    }


@router.delete("/old", status_code=200)
async def delete_old_notifications(
    days: int = Query(90, ge=1, description="N일 이상 된 로그 삭제"),
    db: AsyncSession = Depends(get_db)
):
    """오래된 알림 로그 삭제"""
    deleted = await crud.notification_log.delete_old_logs(db, older_than_days=days)
    return {"deleted": deleted}


