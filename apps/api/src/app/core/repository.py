from datetime import UTC, datetime
from typing import Any

from beanie import Document, PydanticObjectId
from pydantic import BaseModel

from app.core.errors import NotFoundError
from app.core.pagination import decode_cursor, encode_cursor
from app.core.schemas import CursorPage

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class BaseRepository[D: Document]:
    """Generic data access for one document type.

    Subclasses set `model` and add only the queries specific to their domain.
    Keeping CRUD here is what makes a new endpoint roughly fifteen lines.
    """

    model: type[D]

    async def get(self, doc_id: PydanticObjectId) -> D | None:
        return await self.model.get(doc_id)

    async def get_or_404(self, doc_id: PydanticObjectId) -> D:
        doc = await self.get(doc_id)
        if doc is None:
            raise NotFoundError(detail=f"No {self.model.__name__} with that id.")
        return doc

    async def find_one_by(self, **filters: Any) -> D | None:
        return await self.model.find_one(filters)

    async def exists(self, **filters: Any) -> bool:
        return await self.model.find(filters).count() > 0

    async def create(self, doc: D) -> D:
        return await doc.insert()

    async def update(self, doc: D, patch: BaseModel) -> D:
        """Apply only the fields the client actually sent.

        `exclude_unset` rather than `exclude_none`: an explicit null is a real
        instruction to clear a field, while an omitted key means "leave it".
        Conflating them makes clearing a field impossible.
        """
        changes = patch.model_dump(exclude_unset=True, by_alias=False)
        for field, value in changes.items():
            setattr(doc, field, value)
        if hasattr(doc, "updated_at"):
            doc.updated_at = datetime.now(UTC)
        await doc.save()
        return doc

    async def delete(self, doc: D) -> None:
        await doc.delete()

    async def list_page(
        self,
        *,
        limit: int = DEFAULT_PAGE_SIZE,
        cursor: str | None = None,
        filters: dict[str, Any] | None = None,
    ) -> CursorPage[D]:
        """Page by descending _id.

        ObjectIds are monotonic, so `_id < cursor` is a stable "everything
        older than the last row you saw" — it does not shift when documents are
        inserted mid-pagination the way an offset does.

        The limit is clamped because an unbounded page size is a
        denial-of-service knob handed to the caller.
        """
        limit = max(1, min(limit, MAX_PAGE_SIZE))
        query: dict[str, Any] = dict(filters or {})
        if cursor:
            query["_id"] = {"$lt": decode_cursor(cursor)}

        # Fetch one extra to learn whether another page exists without a count.
        rows = await self.model.find(query).sort("-_id").limit(limit + 1).to_list()

        has_more = len(rows) > limit
        items = rows[:limit]
        next_cursor = encode_cursor(items[-1].id) if has_more and items else None
        return CursorPage[D](items=items, next_cursor=next_cursor)
