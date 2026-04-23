"""add user fields to notification_log

Revision ID: 1bc65d6e069d
Revises: o9p0q1r2s3t4
Create Date: 2026-04-23 09:14:39.204595

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bc65d6e069d'
down_revision: Union[str, Sequence[str], None] = 'o9p0q1r2s3t4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notification_logs', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('notification_logs', sa.Column('username', sa.String(), nullable=True))
    op.create_index(op.f('ix_notification_logs_user_id'), 'notification_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_logs_user_id'), table_name='notification_logs')
    op.drop_column('notification_logs', 'username')
    op.drop_column('notification_logs', 'user_id')
