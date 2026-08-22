"""Add interview slot date/time columns to candidate_score_cards

Revision ID: 9a3f5c1e7b44
Revises: 7f1b9d3a5c02
Create Date: 2026-08-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a3f5c1e7b44'
down_revision: Union[str, Sequence[str], None] = '7f1b9d3a5c02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('candidate_score_cards', sa.Column('telephonic_slot_date', sa.String(), nullable=True))
    op.add_column('candidate_score_cards', sa.Column('telephonic_slot_time', sa.String(), nullable=True))
    op.add_column('candidate_score_cards', sa.Column('ai_interview_slot_date', sa.String(), nullable=True))
    op.add_column('candidate_score_cards', sa.Column('ai_interview_slot_time', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('candidate_score_cards', 'ai_interview_slot_time')
    op.drop_column('candidate_score_cards', 'ai_interview_slot_date')
    op.drop_column('candidate_score_cards', 'telephonic_slot_time')
    op.drop_column('candidate_score_cards', 'telephonic_slot_date')
