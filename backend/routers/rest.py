from fastapi import APIRouter

router = APIRouter(prefix="/api/rest", tags=["REST"])

@router.get("/")
def get_items():
    return {"message": "Get all items"}

@router.post("/")
def create_item(item: dict):
    return {"message": "Create item", "item": item}

@router.get("/{item_id}")
def get_item(item_id: int):
    return {"message": f"Get item {item_id}"}
