from pydantic import BaseModel, Field
from typing import Optional

class PreferencesUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    allergies: list[str] = []
    diet: str = "No restriction"
    status: str = "Regular"
    notes: str = ""

class OrderCreate(BaseModel):
    customer_id: int = 1
    item_id: int
    quantity: int = Field(default=1, ge=1, le=50)

