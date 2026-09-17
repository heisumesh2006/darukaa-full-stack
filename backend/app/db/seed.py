"""Opt-in synthetic hackathon fixtures, with no authentication credentials."""

import argparse
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid5

from geoalchemy2 import WKTElement
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import Project, Site, SiteMetric, User

DEMO_NAMESPACE = UUID("a4c0d296-cea9-4c5d-a657-7ffb91fb1b63")
DEMO_EMAIL = "demo@darukaa.example"
DEMO_TIME = datetime(2025, 1, 1, tzinfo=timezone.utc)


def demo_id(label: str) -> UUID:
    return uuid5(DEMO_NAMESPACE, label)


def seed_demo_data(session: Session) -> dict[str, int]:
    """Insert missing fixed-ID demo rows only; caller owns the transaction.

    Never reset, overwrite or delete existing application records. A conflicting
    email owned by a different ID fails atomically instead of taking that account.
    """
    counts = {"users": 0, "projects": 0, "sites": 0, "site_metrics": 0}

    def add(model, label: str, **values) -> None:
        statement = (
            insert(model)
            .values(id=demo_id(label), created_at=DEMO_TIME, updated_at=DEMO_TIME, **values)
            .on_conflict_do_nothing(index_elements=["id"])
            .returning(model.id)
        )
        if session.scalar(statement) is not None:
            counts[model.__tablename__] += 1

    add(
        User,
        "user",
        email=DEMO_EMAIL,
        full_name="Synthetic Demo Administrator",
        password_hash=None,
        is_active=False,
    )
    for key, name, status in (
        ("ghats", "Western Ghats - synthetic restoration demo", "active"),
        ("wetlands", "Odisha wetlands - synthetic biodiversity demo", "draft"),
    ):
        add(
            Project,
            f"project:{key}",
            owner_id=demo_id("user"),
            name=name,
            status=status,
            description="SYNTHETIC HACKATHON DATA. Illustrative locations, not surveyed projects.",
        )

    examples = (
        ("ghats", "Canopy plot A", "73.70 18.50,73.71 18.50,73.71 18.51,73.70 18.51,73.70 18.50"),
        ("ghats", "Canopy plot B", "73.72 18.50,73.74 18.50,73.74 18.51,73.72 18.51,73.72 18.50"),
        (
            "wetlands",
            "Wetland plot A",
            "85.30 19.70,85.31 19.70,85.31 19.71,85.30 19.71,85.30 19.70",
        ),
        (
            "wetlands",
            "Wetland plot B",
            "85.32 19.70,85.335 19.70,85.335 19.715,85.32 19.715,85.32 19.70",
        ),
    )
    for number, (project_key, name, ring) in enumerate(examples):
        label = f"site:{number}"
        add(
            Site,
            label,
            project_id=demo_id(f"project:{project_key}"),
            name=name,
            description="Synthetic polygon; no claim of real land ownership or measured habitat.",
            geometry=WKTElement(f"POLYGON(({ring}))", srid=4326),
        )
        for month in range(1, 7):
            add(
                SiteMetric,
                f"metric:{number}:{month}",
                site_id=demo_id(label),
                recorded_at=datetime(2025, month, 1, tzinfo=timezone.utc),
                carbon_value=Decimal("12.50") * (number + 1) + Decimal("2.25") * month,
                biodiversity_value=Decimal("40") + number * 3 + Decimal("1.50") * month,
            )
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--demo",
        action="store_true",
        required=True,
        help="Explicitly opt in to inserting synthetic development data.",
    )
    parser.parse_args()
    with Session(get_engine()) as session, session.begin():
        counts = seed_demo_data(session)
    print(f"Synthetic demo rows inserted: {counts}")
    print("Demo user is inactive with NULL password_hash; no login is available.")


if __name__ == "__main__":
    main()
