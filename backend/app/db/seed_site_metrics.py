"""Explicit, deterministic synthetic data for a chosen existing development site."""

import argparse
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid5

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import Site, SiteMetric


def seed_site_metrics(session: Session, site_id: UUID) -> int:
    if session.get(Site, site_id) is None:
        raise ValueError("The target site does not exist")
    count = 0
    for month in range(1, 7):
        statement = (
            insert(SiteMetric)
            .values(
                id=uuid5(site_id, f"synthetic-metric-2025-{month}"),
                site_id=site_id,
                recorded_at=datetime(2025, month, 1, tzinfo=timezone.utc),
                carbon_value=Decimal("12.50") + Decimal("2.25") * month,
                biodiversity_value=Decimal("40") + Decimal("1.50") * month,
            )
            .on_conflict_do_nothing()
            .returning(SiteMetric.id)
        )
        count += session.scalar(statement) is not None
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", required=True)
    parser.add_argument("--site-id", type=UUID, required=True)
    args = parser.parse_args()
    with Session(get_engine()) as session, session.begin():
        count = seed_site_metrics(session, args.site_id)
    print(f"Synthetic hackathon metric rows inserted: {count}; no account credentials changed")


if __name__ == "__main__":
    main()
