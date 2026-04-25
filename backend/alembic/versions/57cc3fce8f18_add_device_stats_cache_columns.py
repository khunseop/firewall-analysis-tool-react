"""add_device_stats_cache_columns

Revision ID: 57cc3fce8f18
Revises: 250479d68b62
Create Date: 2026-04-25 12:11:50.022201

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '57cc3fce8f18'
down_revision: Union[str, Sequence[str], None] = '250479d68b62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('devices', sa.Column('cached_policies', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('cached_active_policies', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('cached_disabled_policies', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('cached_network_objects', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('cached_network_groups', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('cached_services', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('cached_service_groups', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('devices', 'cached_service_groups')
    op.drop_column('devices', 'cached_services')
    op.drop_column('devices', 'cached_network_groups')
    op.drop_column('devices', 'cached_network_objects')
    op.drop_column('devices', 'cached_disabled_policies')
    op.drop_column('devices', 'cached_active_policies')
    op.drop_column('devices', 'cached_policies')
