from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from .database import Base

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="Guest")
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="Regular")
    allergies: Mapped[str] = mapped_column(Text, default="")  # comma-separated demo field
    diet: Mapped[str] = mapped_column(String(40), default="No restriction")
    notes: Mapped[str] = mapped_column(Text, default="")
    orders = relationship("Order", back_populates="customer")

class MenuItem(Base):
    __tablename__ = "menu_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(140))
    category: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(Text, default="")
    ingredients: Mapped[str] = mapped_column(Text)
    allergens: Mapped[str] = mapped_column(Text, default="")
    diet_tags: Mapped[str] = mapped_column(String(180), default="")
    price: Mapped[float] = mapped_column(Float)
    available: Mapped[int] = mapped_column(Integer, default=1)

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    item_name: Mapped[str] = mapped_column(String(140))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    total: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="Completed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    customer = relationship("Customer", back_populates="orders")
