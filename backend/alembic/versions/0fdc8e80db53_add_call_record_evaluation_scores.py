"""Add call record evaluation scores

Revision ID: 0fdc8e80db53
Revises: 4c8a26724198
Create Date: 2026-08-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0fdc8e80db53'
down_revision: Union[str, Sequence[str], None] = '4c8a26724198'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('call_records', sa.Column('communication_score', sa.Integer(), nullable=True))
    op.add_column('call_records', sa.Column('relevance_score', sa.Integer(), nullable=True))
    op.add_column('call_records', sa.Column('confidence_score', sa.Integer(), nullable=True))
    op.add_column('call_records', sa.Column('evaluation_summary', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('call_records', 'evaluation_summary')
    op.drop_column('call_records', 'confidence_score')
    op.drop_column('call_records', 'relevance_score')
    op.drop_column('call_records', 'communication_score')
