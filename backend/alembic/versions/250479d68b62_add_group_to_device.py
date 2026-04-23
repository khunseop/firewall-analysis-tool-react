"""add group to device

Revision ID: 250479d68b62
Revises: 1bc65d6e069d
Create Date: 2026-04-23 09:17:15.672065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '250479d68b62'
down_revision: Union[str, Sequence[str], None] = '1bc65d6e069d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('devices', sa.Column('group', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('devices', 'group')
