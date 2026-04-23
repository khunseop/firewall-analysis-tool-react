from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc

from app.models.notification_log import NotificationLog
from app.schemas.notification_log import NotificationLogCreate

async def create_notification_log(db: AsyncSession, notification_log: NotificationLogCreate):
    """알림 로그 생성"""
    db_notification_log = NotificationLog(**notification_log.model_dump())
    db.add(db_notification_log)
    await db.commit()
    await db.refresh(db_notification_log)
    return db_notification_log

async def get_notification_logs(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> tuple[List[NotificationLog], int]:
    """알림 로그 목록 조회"""
    from sqlalchemy import or_
    from datetime import datetime

    query = select(NotificationLog)
    count_query = select(func.count()).select_from(NotificationLog)

    filters = []

    if category:
        filters.append(NotificationLog.category == category)
    if type:
        filters.append(NotificationLog.type == type)
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(
            NotificationLog.title.ilike(term),
            NotificationLog.message.ilike(term),
            NotificationLog.device_name.ilike(term),
        ))
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            filters.append(NotificationLog.timestamp >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            filters.append(NotificationLog.timestamp <= dt)
        except ValueError:
            pass

    if filters:
        from sqlalchemy import and_
        query = query.filter(and_(*filters))
        count_query = count_query.filter(and_(*filters))

    # 최신순 정렬
    query = query.order_by(desc(NotificationLog.timestamp)).offset(skip).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    return logs, total


async def delete_old_logs(db: AsyncSession, older_than_days: int) -> int:
    """N일 이상 된 로그 삭제. 삭제된 건수 반환."""
    from sqlalchemy import delete as sa_delete
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    result = await db.execute(
        sa_delete(NotificationLog).where(NotificationLog.timestamp < cutoff)
    )
    await db.commit()
    return result.rowcount


