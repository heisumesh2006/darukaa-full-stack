from datetime import datetime
from decimal import Decimal

from app.schemas.analytics import MetricSummary

DATA_POLICY = "Synthetic hackathon data only; not verified environmental observations."
CARBON_UNIT = "demo carbon units"
BIODIVERSITY_UNIT = "demo biodiversity score (0–100)"


def summarize(values: list[tuple[datetime, Decimal | None]]) -> MetricSummary:
    observations = [(when, value) for when, value in values if value is not None]
    if not observations:
        return MetricSummary(
            observations=0,
            latest=None,
            latest_at=None,
            minimum=None,
            maximum=None,
            average=None,
            change=None,
            percentage_change=None,
            trend="insufficient_data",
        )
    numbers = [value for _, value in observations]
    first, latest = numbers[0], numbers[-1]
    change = latest - first if len(numbers) > 1 else None
    trend = (
        "insufficient_data"
        if change is None
        else "increasing"
        if change > 0
        else "decreasing"
        if change < 0
        else "stable"
    )
    return MetricSummary(
        observations=len(numbers),
        latest=latest,
        latest_at=observations[-1][0],
        minimum=min(numbers),
        maximum=max(numbers),
        average=sum(numbers) / len(numbers),
        change=change,
        percentage_change=(change / first * 100) if change is not None and first != 0 else None,
        trend=trend,
    )
