from datetime import UTC, datetime
from typing import Any

from beanie import PydanticObjectId

from app.core.age import age_from_birth_year
from app.modules.interactions.models import UserInteraction
from app.modules.interactions.schemas import InteractionAction
from app.modules.matching.schemas import CandidateFilters, EligibleCandidate
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus


class MatchingRepository:
    """Repository for querying candidates satisfying mutual hard filters."""

    async def get_excluded_user_ids(
        self, user_id: PydanticObjectId, limit: int = 5000
    ) -> set[PydanticObjectId]:
        """IDs of users who cannot be shown to this user."""
        collection = UserInteraction.get_pymongo_collection()
        cursor = (
            collection.find(
                {
                    "$or": [
                        {"actor_id": user_id},
                        {"target_id": user_id, "action": InteractionAction.BLOCK},
                    ]
                },
                {"_id": 0, "actor_id": 1, "target_id": 1},
            )
            .sort("created_at", -1)
            .limit(limit)
        )
        interactions = await cursor.to_list(length=limit)
        excluded: set[PydanticObjectId] = {
            doc["target_id"] if doc["actor_id"] == user_id else doc["actor_id"]
            for doc in interactions
        }
        excluded.add(user_id)
        return excluded

    async def get_inbound_admirer_ids(
        self, user_id: PydanticObjectId, limit: int = 1000
    ) -> set[PydanticObjectId]:
        """IDs of users who interacted positively (GREET, LIKE, STAR) with this user."""
        collection = UserInteraction.get_pymongo_collection()
        cursor = (
            collection.find(
                {
                    "target_id": user_id,
                    "action": {
                        "$in": [
                            InteractionAction.GREET,
                            InteractionAction.LIKE,
                            InteractionAction.STAR,
                        ]
                    },
                },
                {"_id": 0, "actor_id": 1},
            )
            .sort("created_at", -1)
            .limit(limit)
        )
        interactions = await cursor.to_list(length=limit)
        return {doc["actor_id"] for doc in interactions}

    async def find_eligible_candidates(
        self,
        user: User,
        filters: CandidateFilters,
        limit: int = 50,
    ) -> list[EligibleCandidate]:
        """Find candidates that pass mutual hard constraints (Stage 1)."""
        current_year = datetime.now(UTC).year
        user_age = age_from_birth_year(user.public.birth_year)

        excluded_ids = await self.get_excluded_user_ids(user.oid)

        base_match: dict[str, Any] = {
            "_id": {"$nin": list(excluded_ids)},
            "status": UserStatus.ACTIVE,
        }

        # Candidate's gender in filters.genders (only filter if a subset is selected)
        all_genders = {"female", "male", "other"}
        if filters.genders and set(filters.genders) < all_genders:
            base_match["public.gender"] = {"$in": filters.genders}

        # Mutual gender: Candidate accepts user's gender
        and_conditions: list[dict[str, Any]] = []
        if user.public.gender is not None:
            and_conditions.append(
                {
                    "$or": [
                        {"matching.criteria.genders": {"$in": [user.public.gender]}},
                        {"matching.criteria.genders": None},
                        {"matching.criteria": None},
                    ]
                }
            )

        # Candidate's age in [filters.age_min, filters.age_max]
        base_match["public.birth_year"] = {
            "$gte": current_year - filters.age_max,
            "$lte": current_year - filters.age_min,
        }

        # Mutual age: Candidate accepts user's age
        and_conditions.append(
            {
                "$or": [
                    {"matching.criteria": None},
                    {"matching.criteria.age_min": None},
                    {
                        "$and": [
                            {"matching.criteria.age_min": {"$lte": user_age}},
                            {"matching.criteria.age_max": {"$gte": user_age}},
                        ]
                    },
                ]
            }
        )

        base_match["$and"] = and_conditions

        # Branch 1: User has valid coordinates (GPS or province centroid fallback)
        effective_coords: list[float] | None = None
        if user.private.location and len(user.private.location.coordinates) == 2:
            effective_coords = user.private.location.coordinates
        elif user.public.city:
            from app.core.vietnam_provinces import get_province_centroid

            centroid = get_province_centroid(user.public.city)
            if centroid:
                effective_coords = [centroid[0], centroid[1]]

        if effective_coords is not None:
            max_dist_meters = (
                (filters.max_distance_km * 1000)
                if (filters.max_distance_km is not None and filters.max_distance_km > 0)
                else None
            )
            # Expand pool to avoid geographic starvation of high-compatibility users
            geo_pool_limit = min(max(limit * 4, 100), 500)
            geo_near_stage: dict[str, Any] = {
                "near": {
                    "type": "Point",
                    "coordinates": effective_coords,
                },
                "distanceField": "distance_meters",
                "spherical": True,
                "query": base_match,
            }
            if max_dist_meters is not None:
                geo_near_stage["maxDistance"] = max_dist_meters

            pipeline: list[dict[str, Any]] = [
                {"$geoNear": geo_near_stage},
                {
                    "$match": {
                        "$or": [
                            {"matching.criteria": None},
                            {"matching.criteria.max_distance_km": None},
                            {
                                "$expr": {
                                    "$lte": [
                                        "$distance_meters",
                                        {
                                            "$multiply": [
                                                "$matching.criteria.max_distance_km",
                                                1000,
                                            ]
                                        },
                                    ]
                                }
                            },
                        ]
                    }
                },
                {"$limit": geo_pool_limit},
            ]

            raw_docs = await User.aggregate(pipeline).to_list()
            candidates: list[EligibleCandidate] = []
            seen_ids: set[PydanticObjectId] = set()

            for doc in raw_docs:
                dist_meters = doc.get("distance_meters")
                dist_km = (
                    round(dist_meters / 1000.0, 1) if dist_meters is not None else None
                )
                doc_copy = dict(doc)
                doc_copy.pop("distance_meters", None)
                candidate_user = User.model_validate(doc_copy)
                candidates.append(
                    EligibleCandidate(user=candidate_user, distance_km=dist_km)
                )
                seen_ids.add(candidate_user.oid)

            # If fewer than limit, supplement with users without GPS
            if len(candidates) < limit:
                remaining = limit - len(candidates)
                city_match = dict(base_match)
                city_match["_id"]["$nin"].extend(list(seen_ids))
                if user.public.city and filters.max_distance_km is not None:
                    city_match["public.city"] = user.public.city
                city_match["private.location"] = None

                city_users = await User.find(city_match).limit(remaining).to_list()
                for cu in city_users:
                    candidates.append(EligibleCandidate(user=cu, distance_km=None))

            return candidates

        # Branch 2: User has no GPS -> Filter by city if distance restricted
        city_match = dict(base_match)
        if filters.cities:
            city_match["public.city"] = {"$in": filters.cities}
        elif user.public.city and filters.max_distance_km is not None:
            city_match["public.city"] = user.public.city

        city_users = await User.find(city_match).limit(limit).to_list()
        return [EligibleCandidate(user=u, distance_km=None) for u in city_users]
