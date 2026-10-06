from functools import cache

from app.modules.catalog.options import (
    ATTRIBUTE_ICONS,
    ATTRIBUTES,
    HEIGHT_MAX,
    HEIGHT_MIN,
    INTEREST_GROUP_ICONS,
    INTEREST_GROUPS,
    INTEREST_ICONS,
    MATCHING_ONLY,
    MAX_INTERESTS,
    OPTION_ICONS,
)
from app.modules.catalog.schemas import (
    AttributeRead,
    InterestGroupRead,
    OptionRead,
    ProfileOptionsRead,
)


def _options(
    pairs: tuple[tuple[str, str], ...], icons: dict[str, str]
) -> list[OptionRead]:
    return [
        OptionRead(value=value, label=label, icon=icons.get(value))
        for value, label in pairs
    ]


@cache  # Static between deploys: build it once per process.
def profile_options() -> ProfileOptionsRead:
    return ProfileOptionsRead(
        attributes=[
            AttributeRead(
                key=key,
                label=spec.label,
                icon=ATTRIBUTE_ICONS.get(key),
                group=spec.group,
                multi=spec.multi,
                matching_only=key in MATCHING_ONLY,
                options=_options(spec.options, OPTION_ICONS.get(key, {})),
            )
            for key, spec in ATTRIBUTES.items()
        ],
        interest_groups=[
            InterestGroupRead(
                label=label,
                icon=INTEREST_GROUP_ICONS.get(label),
                options=_options(options, INTEREST_ICONS),
            )
            for label, options in INTEREST_GROUPS.items()
        ],
        max_interests=MAX_INTERESTS,
        height_min=HEIGHT_MIN,
        height_max=HEIGHT_MAX,
    )
