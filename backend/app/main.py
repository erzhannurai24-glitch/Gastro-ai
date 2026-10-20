from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, time, timedelta, timezone
import os

from .database import Base, engine, get_db, SessionLocal
from .models import Customer, MenuItem, Order
from .schemas import PreferencesUpdate, OrderCreate

app = FastAPI(title="Gasto AI API", version="1.0.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def csv_list(value: str) -> list[str]:
    return [part.strip() for part in (value or "").split(",") if part.strip()]

def serialize_menu(item: MenuItem):
    return {
        "id": item.id, "name": item.name, "category": item.category,
        "description": item.description, "ingredients": csv_list(item.ingredients),
        "allergens": csv_list(item.allergens), "diet_tags": csv_list(item.diet_tags),
        "price": item.price, "available": bool(item.available),
    }

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(Customer).first():
            db.add_all([
                Customer(id=1, name="Alex Morgan", email="alex@example.com", status="Regular",
                         allergies="peanuts", diet="No restriction", notes="Prefers sauces on the side"),
                Customer(id=2, name="Dana Lee", email="dana@example.com", status="VIP",
                         allergies="", diet="Vegetarian", notes="No onions, if possible"),
            ])
            db.add_all([
                MenuItem(name="Roasted chicken bowl", category="Mains",
                         description="Roasted chicken, rice and seasonal greens.",
                         ingredients="chicken,rice,spinach,olive oil,lemon,garlic",
                         allergens="", diet_tags="gluten-free,high-protein", price=3200),
                MenuItem(name="Creamy mushroom pasta", category="Mains",
                         description="Pasta with mushrooms and a silky cream sauce.",
                         ingredients="wheat pasta,mushrooms,cream,parmesan,garlic,butter",
                         allergens="wheat,milk", diet_tags="vegetarian", price=2900),
                MenuItem(name="Peanut sesame noodles", category="Mains",
                         description="Cold noodles with a peanut-sesame dressing.",
                         ingredients="wheat noodles,peanuts,sesame,soy sauce,lime,chili",
                         allergens="wheat,peanuts,soy,sesame", diet_tags="vegetarian", price=2600),
                MenuItem(name="Lentil garden salad", category="Salads",
                         description="Lentils, cucumber, tomato and lemon dressing.",
                         ingredients="lentils,cucumber,tomato,parsley,lemon,olive oil",
                         allergens="", diet_tags="vegan,vegetarian,gluten-free", price=2100),
                MenuItem(name="Salmon with potatoes", category="Mains",
                         description="Pan-seared salmon with baby potatoes and dill.",
                         ingredients="salmon,potatoes,dill,lemon,olive oil",
                         allergens="fish", diet_tags="gluten-free,high-protein", price=4200),
                MenuItem(name="Berry oat crumble", category="Desserts",
                         description="Warm berries with an oat crumble topping.",
                         ingredients="berries,oats,butter,brown sugar,wheat flour",
                         allergens="milk,wheat", diet_tags="vegetarian", price=1500),
            ])
            db.commit()
        if db.query(Order).count() == 0:
            customer = db.query(Customer).filter(Customer.id == 1).first()
            items = db.query(MenuItem).limit(3).all()
            for idx, item in enumerate(items):
                db.add(Order(customer_id=customer.id, item_name=item.name,
                             quantity=idx + 1, total=item.price * (idx + 1),
                             status="Completed"))
            db.commit()
    finally:
        db.close()

@app.on_event("startup")
def startup():
    seed_data()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/menu")
def get_menu(db: Session = Depends(get_db)):
    return [serialize_menu(item) for item in db.query(MenuItem).filter(MenuItem.available == 1).all()]

@app.get("/menu/recommendations")
def recommendations(
    customer_id: int = 1,
    allergens: str = "",
    diet: str = "",
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer and not allergens:
        allergens = customer.allergies
    if customer and not diet:
        diet = customer.diet
    forbidden = {x.lower() for x in csv_list(allergens)}
    results = []
    for item in db.query(MenuItem).filter(MenuItem.available == 1).all():
        item_allergens = {x.lower() for x in csv_list(item.allergens)}
        item_ingredients = {x.lower() for x in csv_list(item.ingredients)}
        # Ingredient-name match is a conservative extra check, not a safety guarantee.
        blocked = forbidden.intersection(item_allergens) or forbidden.intersection(item_ingredients)
        if blocked:
            continue
        tags = {x.lower() for x in csv_list(item.diet_tags)}
        if diet.lower() in ("vegan", "vegetarian", "gluten-free") and diet.lower() not in tags:
            continue
        results.append(serialize_menu(item))
    return {"items": results, "excluded_count": max(0, db.query(MenuItem).filter(MenuItem.available == 1).count() - len(results)),
            "safety_note": "Confirm every order with staff. This text match cannot detect cross-contact or undeclared ingredients."}

@app.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    customers = db.query(Customer).order_by(Customer.id).all()
    return [{"id": c.id, "name": c.name, "email": c.email, "status": c.status,
             "allergies": csv_list(c.allergies), "diet": c.diet, "notes": c.notes} for c in customers]

@app.get("/customers/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    return {"id": c.id, "name": c.name, "email": c.email, "status": c.status,
            "allergies": csv_list(c.allergies), "diet": c.diet, "notes": c.notes}

@app.put("/customers/{customer_id}/preferences")
def update_preferences(customer_id: int, data: PreferencesUpdate, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    if data.name is not None:
        c.name = data.name
    c.allergies = ",".join(data.allergies)
    c.diet = data.diet
    c.status = data.status
    c.notes = data.notes
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "email": c.email, "status": c.status,
            "allergies": csv_list(c.allergies), "diet": c.diet, "notes": c.notes}

@app.get("/orders")
def get_orders(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).limit(limit).all()
    return [{"id": o.id, "customer_id": o.customer_id, "customer_name": o.customer.name,
             "item_name": o.item_name, "quantity": o.quantity, "total": o.total,
             "status": o.status, "created_at": o.created_at.isoformat()} for o in orders]

@app.post("/orders")
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    item = db.query(MenuItem).filter(MenuItem.id == data.item_id, MenuItem.available == 1).first()
    if not customer or not item:
        raise HTTPException(404, "Customer or menu item not found")
    declared = {x.lower() for x in csv_list(customer.allergies)}
    item_allergens = {x.lower() for x in csv_list(item.allergens)}
    if declared.intersection(item_allergens):
        raise HTTPException(400, "Order blocked: item matches a declared allergen. Ask staff to verify.")
    order = Order(customer_id=customer.id, item_name=item.name, quantity=data.quantity,
                  total=round(item.price * data.quantity, 2), status="Completed")
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"id": order.id, "message": "Order recorded", "total": order.total}

@app.get("/reports/daily")
def daily_report(report_date: date = Query(default_factory=date.today, alias="date"), db: Session = Depends(get_db)):
    start = datetime.combine(report_date, time.min).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    orders = db.query(Order).filter(Order.created_at >= start, Order.created_at < end).all()
    revenue = sum(o.total for o in orders)
    item_totals = {}
    for order in orders:
        item_totals[order.item_name] = item_totals.get(order.item_name, 0) + order.quantity
    return {
        "date": report_date.isoformat(),
        "orders_count": len(orders),
        "items_sold": sum(o.quantity for o in orders),
        "revenue": round(revenue, 2),
        "average_order": round(revenue / len(orders), 2) if orders else 0,
        "top_items": [{"name": k, "quantity": v} for k, v in sorted(item_totals.items(), key=lambda x: x[1], reverse=True)],
        "orders": [{"id": o.id, "customer": o.customer.name, "item": o.item_name,
                    "quantity": o.quantity, "total": o.total, "status": o.status,
                    "time": o.created_at.isoformat()} for o in orders],
    }
