from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, update, func
from sqlalchemy.sql import exists

from app.models.policy import Policy
from app.schemas.policy import PolicyCreate
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List

from app import models, schemas
from app.services.normalize import parse_ipv4_numeric, parse_port_numeric

async def get_policy(db: AsyncSession, policy_id: int):
    result = await db.execute(select(Policy).filter(Policy.id == policy_id))
    return result.scalars().first()

async def get_policies_by_device(db: AsyncSession, device_id: int, skip: int = 0, limit: int | None = None):
    stmt = select(Policy).filter(Policy.device_id == device_id, Policy.is_active == True).offset(skip)
    if limit:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_all_active_policies_by_device(db: AsyncSession, device_id: int):
    result = await db.execute(select(Policy).filter(Policy.device_id == device_id, Policy.is_active == True))
    return result.scalars().all()

async def create_policies(db: AsyncSession, policies: list[PolicyCreate]):
    db_policies = [Policy(**policy.model_dump()) for policy in policies]
    db.add_all(db_policies)
    return db_policies

async def update_policy(db: AsyncSession, db_obj: Policy, obj_in: PolicyCreate):
    # Exclude None to avoid overwriting existing values with nulls
    obj_data = obj_in.model_dump(exclude_unset=True, exclude_none=True)
    for field in obj_data:
        setattr(db_obj, field, obj_data[field])
    db.add(db_obj)
    return db_obj

async def delete_policy(db: AsyncSession, policy: Policy):
    await db.delete(policy)
    return policy


async def count_policies_by_device(db: AsyncSession, device_id: int) -> dict:
    """장비별 정책 수량을 카운트합니다. (총 정책 수, 비활성화 정책 수)"""
    total_count = await db.execute(
        select(func.count(Policy.id)).where(
            Policy.device_id == device_id,
            Policy.is_active == True
        )
    )
    total = total_count.scalar() or 0
    
    disabled_count = await db.execute(
        select(func.count(Policy.id)).where(
            Policy.device_id == device_id,
            Policy.is_active == True,
            Policy.enable == False
        )
    )
    disabled = disabled_count.scalar() or 0
    
    return {"total": total, "disabled": disabled}


async def search_policies(db: AsyncSession, req: schemas.PolicySearchRequest) -> List[Policy]:
    if not req.device_ids:
        return []

    stmt = select(Policy).where(
        Policy.is_active == True,
        Policy.device_id.in_(req.device_ids),
    )

    # Text filters (ILIKE contains, with optional negation)
    from sqlalchemy import or_, and_

    def _text_filter(col, val: str, negate: bool = False):
        cond = col.ilike(f"%{val.strip()}%")
        return ~cond if negate else cond

    if req.vsys:
        stmt = stmt.where(_text_filter(Policy.vsys, req.vsys, req.vsys_negate))
    if req.rule_name:
        names = [n.strip() for n in req.rule_name.split(',') if n.strip()]
        if names:
            if req.rule_name_negate:
                # NOT (A OR B) = NOT A AND NOT B
                stmt = stmt.where(and_(*[~Policy.rule_name.ilike(f'%{n}%') for n in names]))
            else:
                stmt = stmt.where(or_(*[Policy.rule_name.ilike(f'%{n}%') for n in names]))
    if req.user:
        stmt = stmt.where(_text_filter(Policy.user, req.user, req.user_negate))
    if req.application:
        stmt = stmt.where(_text_filter(Policy.application, req.application, req.application_negate))
    if req.security_profile:
        stmt = stmt.where(Policy.security_profile.ilike(f"%{req.security_profile.strip()}%"))
    if req.category:
        stmt = stmt.where(Policy.category.ilike(f"%{req.category.strip()}%"))
    if req.description:
        stmt = stmt.where(_text_filter(Policy.description, req.description, req.description_negate))

    # Exact-ish filters (with optional negation)
    if req.action:
        action_val = req.action.strip().lower()
        if req.action_negate:
            stmt = stmt.where(func.lower(Policy.action) != action_val)
        else:
            stmt = stmt.where(func.lower(Policy.action) == action_val)
    if req.enable is not None:
        stmt = stmt.where(Policy.enable == req.enable)

    # Date range (normalize to naive Asia/Seoul to match stored)
    def _naive_seoul(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is not None:
            try:
                dt = dt.astimezone(ZoneInfo("Asia/Seoul"))
            except Exception:
                pass
            dt = dt.replace(tzinfo=None)
        return dt
    frm = _naive_seoul(req.last_hit_date_from)
    to = _naive_seoul(req.last_hit_date_to)
    if frm is not None:
        stmt = stmt.where(Policy.last_hit_date >= frm)
    if to is not None:
        stmt = stmt.where(Policy.last_hit_date <= to)

    # --- Member-index 기반 복합 필터링 ---
    # 각 필터 유형(출발지 IP, 목적지 IP, 서비스/포트)별로 일치하는 정책 ID들을 수집합니다.
    # 동일 필터 내의 여러 값은 'OR(합집합)'으로 처리하며, 서로 다른 필터(IP vs 서비스) 간에는 'AND(교집합)'로 처리합니다.

    list_of_policy_id_sets = []

    # 출발지 IP 필터 (Source IP Index 활용)
    if req.src_ips:
        src_policy_ids = set()
        for ip_str in req.src_ips:
            # IP를 숫자 범위(start, end)로 변환하여 검색 (단일 IP 또는 대역폭 모두 지원)
            _, start, end = parse_ipv4_numeric(ip_str)
            if start is not None and end is not None:
                # 정책 대역과 검색 대역이 겹치는지(Overlapping) 확인하는 쿼리
                query = select(models.PolicyAddressMember.policy_id).where(
                    models.PolicyAddressMember.device_id.in_(req.device_ids),
                    models.PolicyAddressMember.direction == 'source',
                    models.PolicyAddressMember.ip_start <= end, # 정책 시작점이 검색 종료점보다 작거나 같고
                    models.PolicyAddressMember.ip_end >= start   # 정책 종료점이 검색 시작점보다 크거나 같음
                )
                result = await db.execute(query)
                src_policy_ids.update(result.scalars().all())
        list_of_policy_id_sets.append(src_policy_ids)

    # 목적지 IP 필터 (Destination IP Index 활용)
    if req.dst_ips:
        dst_policy_ids = set()
        for ip_str in req.dst_ips:
            _, start, end = parse_ipv4_numeric(ip_str)
            if start is not None and end is not None:
                query = select(models.PolicyAddressMember.policy_id).where(
                    models.PolicyAddressMember.device_id.in_(req.device_ids),
                    models.PolicyAddressMember.direction == 'destination',
                    models.PolicyAddressMember.ip_start <= end,
                    models.PolicyAddressMember.ip_end >= start
                )
                result = await db.execute(query)
                dst_policy_ids.update(result.scalars().all())
        list_of_policy_id_sets.append(dst_policy_ids)

    # 서비스 필터 (Service/Port Index 활용 + 이름 폴백)
    if req.services:
        svc_policy_ids = set()
        or_conditions = []
        name_fallback_tokens = []  # 포트 파싱 실패 → 이름 검색으로 폴백

        for token in req.services:
            token = token.strip()
            if not token:
                continue

            proto = None
            ports_str = token
            if '/' in token:
                parts = token.split('/', 1)
                proto = parts[0].strip().lower()
                ports_str = parts[1].strip()

            pstart, pend = parse_port_numeric(ports_str)

            if pstart is not None and pend is not None:
                port_condition = and_(
                    models.PolicyServiceMember.port_start <= pend,
                    models.PolicyServiceMember.port_end >= pstart
                )
                if proto and proto != 'any':
                    final_condition = and_(port_condition, func.lower(models.PolicyServiceMember.protocol) == proto)
                else:
                    final_condition = and_(
                        port_condition,
                        func.lower(models.PolicyServiceMember.protocol).in_(['tcp', 'udp', 'any'])
                    )
                or_conditions.append(final_condition)
            else:
                # 포트로 파싱 불가 → 서비스 객체명 ILIKE로 폴백
                name_fallback_tokens.append(token)

        if or_conditions:
            query = select(models.PolicyServiceMember.policy_id).where(
                models.PolicyServiceMember.device_id.in_(req.device_ids),
                or_(*or_conditions)
            )
            result = await db.execute(query)
            svc_policy_ids.update(result.scalars().all())

        if name_fallback_tokens:
            name_query = select(models.PolicyServiceMember.policy_id).where(
                models.PolicyServiceMember.device_id.in_(req.device_ids),
                or_(*[models.PolicyServiceMember.token.ilike(f'%{n}%') for n in name_fallback_tokens])
            )
            result = await db.execute(name_query)
            svc_policy_ids.update(result.scalars().all())

        # 실제 검색이 수행된 경우에만 교집합에 추가 (빈 set이 모든 결과를 지우는 버그 방지)
        if or_conditions or name_fallback_tokens:
            list_of_policy_id_sets.append(svc_policy_ids)

    # 출발지 객체명 필터 (PolicyAddressMember.token ILIKE)
    if req.src_names:
        from sqlalchemy import or_ as _or_src
        valid_src_names = [n.strip() for n in req.src_names if n.strip()]
        if valid_src_names:
            src_name_ids = set()
            query = select(models.PolicyAddressMember.policy_id).where(
                models.PolicyAddressMember.device_id.in_(req.device_ids),
                models.PolicyAddressMember.direction == 'source',
                _or_src(*[models.PolicyAddressMember.token.ilike(f'%{n}%') for n in valid_src_names])
            )
            result = await db.execute(query)
            src_name_ids.update(result.scalars().all())
            list_of_policy_id_sets.append(src_name_ids)

    # 목적지 객체명 필터 (PolicyAddressMember.token ILIKE)
    if req.dst_names:
        from sqlalchemy import or_ as _or_dst
        valid_dst_names = [n.strip() for n in req.dst_names if n.strip()]
        if valid_dst_names:
            dst_name_ids = set()
            query = select(models.PolicyAddressMember.policy_id).where(
                models.PolicyAddressMember.device_id.in_(req.device_ids),
                models.PolicyAddressMember.direction == 'destination',
                _or_dst(*[models.PolicyAddressMember.token.ilike(f'%{n}%') for n in valid_dst_names])
            )
            result = await db.execute(query)
            dst_name_ids.update(result.scalars().all())
            list_of_policy_id_sets.append(dst_name_ids)

    # 서비스 객체명 필터 (PolicyServiceMember.token ILIKE)
    if req.service_names:
        from sqlalchemy import or_ as _or_svc
        valid_svc_names = [n.strip() for n in req.service_names if n.strip()]
        if valid_svc_names:
            svc_name_ids = set()
            query = select(models.PolicyServiceMember.policy_id).where(
                models.PolicyServiceMember.device_id.in_(req.device_ids),
                _or_svc(*[models.PolicyServiceMember.token.ilike(f'%{n}%') for n in valid_svc_names])
            )
            result = await db.execute(query)
            svc_name_ids.update(result.scalars().all())
            list_of_policy_id_sets.append(svc_name_ids)

    # 모든 개별 인덱스 필터(IP, Service) 결과의 교집합(Intersection)을 최종 정책 ID 목록으로 확정
    if list_of_policy_id_sets:
        final_policy_ids = set.intersection(*list_of_policy_id_sets)

        if not final_policy_ids:
            return []

        stmt = stmt.where(Policy.id.in_(final_policy_ids))

    # ─── 제외 필터 (NOT IN) ───────────────────────────────────────────────────

    async def _collect_addr_ids(direction: str, ip_list: list) -> set:
        ids: set = set()
        for ip_str in ip_list:
            _, start, end = parse_ipv4_numeric(ip_str)
            if start is not None and end is not None:
                q = select(models.PolicyAddressMember.policy_id).where(
                    models.PolicyAddressMember.device_id.in_(req.device_ids),
                    models.PolicyAddressMember.direction == direction,
                    models.PolicyAddressMember.ip_start <= end,
                    models.PolicyAddressMember.ip_end >= start
                )
                r = await db.execute(q)
                ids.update(r.scalars().all())
        return ids

    async def _collect_svc_ids(token_list: list) -> set:
        ids: set = set()
        svc_or: list = []
        name_tokens: list = []
        for token in token_list:
            token = token.strip()
            if not token:
                continue
            proto = None
            ports_str = token
            if '/' in token:
                p, ports_str = token.split('/', 1)
                proto = p.strip().lower()
                ports_str = ports_str.strip()
            pstart, pend = parse_port_numeric(ports_str)
            if pstart is not None and pend is not None:
                pc = and_(
                    models.PolicyServiceMember.port_start <= pend,
                    models.PolicyServiceMember.port_end >= pstart
                )
                if proto and proto != 'any':
                    svc_or.append(and_(pc, func.lower(models.PolicyServiceMember.protocol) == proto))
                else:
                    svc_or.append(and_(pc, func.lower(models.PolicyServiceMember.protocol).in_(['tcp', 'udp', 'any'])))
            else:
                name_tokens.append(token)
        if svc_or:
            q = select(models.PolicyServiceMember.policy_id).where(
                models.PolicyServiceMember.device_id.in_(req.device_ids),
                or_(*svc_or)
            )
            r = await db.execute(q)
            ids.update(r.scalars().all())
        if name_tokens:
            q = select(models.PolicyServiceMember.policy_id).where(
                models.PolicyServiceMember.device_id.in_(req.device_ids),
                or_(*[models.PolicyServiceMember.token.ilike(f'%{n}%') for n in name_tokens])
            )
            r = await db.execute(q)
            ids.update(r.scalars().all())
        return ids

    if req.src_ips_exclude:
        excluded = await _collect_addr_ids('source', req.src_ips_exclude)
        if excluded:
            stmt = stmt.where(Policy.id.notin_(excluded))

    if req.dst_ips_exclude:
        excluded = await _collect_addr_ids('destination', req.dst_ips_exclude)
        if excluded:
            stmt = stmt.where(Policy.id.notin_(excluded))

    if req.services_exclude:
        excluded = await _collect_svc_ids(req.services_exclude)
        if excluded:
            stmt = stmt.where(Policy.id.notin_(excluded))

    if req.src_names_exclude:
        valid = [n.strip() for n in req.src_names_exclude if n.strip()]
        if valid:
            q = select(models.PolicyAddressMember.policy_id).where(
                models.PolicyAddressMember.device_id.in_(req.device_ids),
                models.PolicyAddressMember.direction == 'source',
                or_(*[models.PolicyAddressMember.token.ilike(f'%{n}%') for n in valid])
            )
            r = await db.execute(q)
            excluded = set(r.scalars().all())
            if excluded:
                stmt = stmt.where(Policy.id.notin_(excluded))

    if req.dst_names_exclude:
        valid = [n.strip() for n in req.dst_names_exclude if n.strip()]
        if valid:
            q = select(models.PolicyAddressMember.policy_id).where(
                models.PolicyAddressMember.device_id.in_(req.device_ids),
                models.PolicyAddressMember.direction == 'destination',
                or_(*[models.PolicyAddressMember.token.ilike(f'%{n}%') for n in valid])
            )
            r = await db.execute(q)
            excluded = set(r.scalars().all())
            if excluded:
                stmt = stmt.where(Policy.id.notin_(excluded))

    if req.service_names_exclude:
        valid = [n.strip() for n in req.service_names_exclude if n.strip()]
        if valid:
            q = select(models.PolicyServiceMember.policy_id).where(
                models.PolicyServiceMember.device_id.in_(req.device_ids),
                or_(*[models.PolicyServiceMember.token.ilike(f'%{n}%') for n in valid])
            )
            r = await db.execute(q)
            excluded = set(r.scalars().all())
            if excluded:
                stmt = stmt.where(Policy.id.notin_(excluded))

    # Ordering: device -> vsys -> seq -> rule_name
    stmt = stmt.order_by(Policy.device_id.asc(), Policy.vsys.asc(), Policy.seq.asc(), Policy.rule_name.asc())

    # Slice optionally
    if req.skip:
        stmt = stmt.offset(req.skip)
    if req.limit:
        stmt = stmt.limit(req.limit)

    result = await db.execute(stmt)
    return result.scalars().all()
