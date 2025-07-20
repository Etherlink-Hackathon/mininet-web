from __future__ import annotations

"""Shard endpoints – groups authorities into logical shards/clusters.

For now we derive a *shard_id* by splitting the authority name on '-' and
using the first segment (e.g. 'shard1-auth3' → 'shard1').  If no '-', each
authority becomes a shard of its own.  This keeps the data structure flexible
until the real FastPay shard metadata is exposed by the mesh gateway.
"""

from typing import List, Dict, Any, DefaultDict
from collections import defaultdict

from fastapi import APIRouter, Depends

from app.services import MeshClient, get_mesh_client

router = APIRouter(prefix="/shards", tags=["Shards"])


@router.get("/", summary="List shards", response_model=List[Dict[str, Any]])
async def list_shards(client: MeshClient = Depends(get_mesh_client)) -> List[Dict[str, Any]]:
    """Return shards with their member authorities.

    Each item:
    ```json
    {
      "shard_id": "shard1",
      "authorities": ["auth1", "auth2"]
    }
    ```
    """
    authorities = await client.get_shards()

    groups: DefaultDict[str, List[str]] = defaultdict(list)
    for auth in authorities:
        name: str = auth["name"]
        shard_id = name.split("-", 1)[0] if "-" in name else name  # naive rule
        groups[shard_id].append(name)

    return [
        {"shard_id": shard, "authorities": members}
        for shard, members in groups.items()
    ]
