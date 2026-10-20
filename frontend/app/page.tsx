"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type MenuItem = { id:number; name:string; category:string; description:string; ingredients:string[]; allergens:string[]; diet_tags:string[]; price:number; available:boolean };
type Customer = { id:number; name:string; email:string; status:string; allergies:string[]; diet:string; notes:string };
type Order = { id:number; customer_id:number; customer_name:string; item_name:string; quantity:number; total:number; status:string; created_at:string };
type Report = { date:string; orders_count:number; items_sold:number; revenue:number; average_order:number; top_items:{name:string;quantity:number}[]; orders:{id:number;customer:string;item:string;quantity:number;total:number;status:string;time:string}[] };

const money = (n:number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"KZT",maximumFractionDigits:0}).format(n).replace("KZT","₸");

export default function Home() {
  const [tab, setTab] = useState("Overview");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [recommended, setRecommended] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [search, setSearch] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftAllergies, setDraftAllergies] = useState<string[]>([]);
  const [draftDiet, setDraftDiet] = useState("No restriction");
  const [draftStatus, setDraftStatus] = useState("Regular");
  const [draftNotes, setDraftNotes] = useState("");
  const [orderBusy, setOrderBusy] = useState<number | null>(null);

  async function request(path:string, init?:RequestInit) {
    const response = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type":"application/json", ...(init?.headers || {}) } });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed (${response.status})`);
    }
    return response.json();
  }
  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [m,c,cs,o,r,recs] = await Promise.all([
        request("/menu"), request("/customers/1"), request("/customers"), request("/orders"),
        request(`/reports/daily?date=${date}`), request("/menu/recommendations?customer_id=1")
      ]);
      setMenu(m); setCustomer(c); setCustomers(cs); setOrders(o); setReport(r); setRecommended(recs.items);
      setDraftName(c.name); setDraftAllergies(c.allergies); setDraftDiet(c.diet); setDraftStatus(c.status); setDraftNotes(c.notes);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not connect to the API."); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, [date]);
  const filteredMenu = useMemo(() => menu.filter(item => `${item.name} ${item.category} ${item.ingredients.join(" ")}`.toLowerCase().includes(search.toLowerCase())), [menu,search]);
  const todayRevenue = report?.revenue ?? 0;
  const todayOrders = report?.orders_count ?? 0;

  async function savePreferences() {
    setSaved(false); setError("");
    try {
      const updated = await request("/customers/1/preferences", { method:"PUT", body:JSON.stringify({name:draftName, allergies:draftAllergies, diet:draftDiet, status:draftStatus, notes:draftNotes}) });
      setCustomer(updated); setSaved(true);
      const recs = await request("/menu/recommendations?customer_id=1");
      setRecommended(recs.items);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save preferences."); }
  }
  async function placeOrder(item:MenuItem) {
    setOrderBusy(item.id); setError("");
    try {
      await request("/orders", {method:"POST", body:JSON.stringify({customer_id:1,item_id:item.id,quantity:1})});
      await loadAll();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not place order."); }
    finally { setOrderBusy(null); }
  }

  const nav = [{name:"Overview",icon:"◫"},{name:"Menu & matches",icon:"⌕"},{name:"My profile",icon:"◎"},{name:"Operations",icon:"▤"},{name:"Customers",icon:"♧"}];
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">g.</span><div><b>gasto</b><small>DINING, PERSONALLY</small></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{nav.map(n=><button key={n.name} onClick={()=>setTab(n.name)} className={`nav-item ${tab===n.name?"active":""}`}><span className="nav-icon">{n.icon}</span>{n.name}{n.name==="Operations"&&<span className="nav-dot"/>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="help-icon">?</div><div><b>Need a hand?</b><small>Talk to your team lead</small></div><span className="side-arrow">↗</span></div>
        <div className="profile-mini"><div className="avatar">AM</div><div><b>{customer?.name || "Alex Morgan"}</b><small>Customer workspace</small></div><span className="more">•••</span></div>
      </aside>
      <section className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{tab}</b></div><div className="top-actions"><span className="open-status"><i/> Service online</span><button className="icon-button" aria-label="Notifications">♧<em/></button><div className="avatar small">AM</div></div></header>
        <div className="content">
          {error && <div className="error-banner">{error}<button onClick={()=>setError("")}>×</button></div>}
          {loading && <div className="loading-line">Loading your workspace…</div>}
          {!loading && <>
          {tab==="Overview" && <Overview customer={customer} report={report} menu={menu} recommended={recommended} setTab={setTab} placeOrder={placeOrder} orderBusy={orderBusy}/>}
          {tab==="Menu & matches" && <MenuView items={filteredMenu} recommended={recommended} search={search} setSearch={setSearch} placeOrder={placeOrder} orderBusy={orderBusy}/>}
          {tab==="My profile" && <Profile name={draftName} setName={setDraftName} allergies={draftAllergies} setAllergies={setDraftAllergies} diet={draftDiet} setDiet={setDraftDiet} status={draftStatus} setStatus={setDraftStatus} notes={draftNotes} setNotes={setDraftNotes} save={savePreferences} saved={saved}/>}
          {tab==="Operations" && <Operations report={report} orders={orders} date={date} setDate={setDate}/>}
          {tab==="Customers" && <Customers customers={customers} setTab={setTab}/>}
          </>}
          <footer><span>© 2026 Gasto. Thoughtful service, remembered.</span><span>Built for people, not just orders.</span></footer>
        </div>
      </section>
    </main>
  );
}

function PageHeading({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:React.ReactNode}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>;
}
function Overview({customer,report,menu,recommended,setTab,placeOrder,orderBusy}:{customer:Customer|null;report:Report|null;menu:MenuItem[];recommended:MenuItem[];setTab:(s:string)=>void;placeOrder:(i:MenuItem)=>void;orderBusy:number|null}) {
  return <>
    <PageHeading eyebrow="TUESDAY, YOUR WAY" title={<>Good evening, {customer?.name?.split(" ")[0] || "Alex"}<span className="period">.</span></>} desc="A little more personal, every time you sit down." action={<button className="button dark" onClick={()=>setTab("Menu & matches")}>Explore menu <span>↗</span></button>}/>
    <div className="welcome-card"><div className="welcome-copy"><span className="tag light-tag">MADE AROUND YOU</span><h2>Your preferences.<br/>Already at the table.</h2><p>We use your saved preferences to help you find dishes that fit. Always confirm allergy details with our team.</p><button className="text-button light-text" onClick={()=>setTab("My profile")}>Review my profile <span>→</span></button></div><div className="welcome-art"><div className="plate plate-outer"><div className="plate plate-inner"><div className="food-leaf leaf-one"/><div className="food-leaf leaf-two"/><div className="food-dot dot-one"/><div className="food-dot dot-two"/><div className="food-dot dot-three"/></div></div><span className="art-note">FRESH, THOUGHTFUL, YOURS</span></div></div>
    <div className="section-title"><div><h2>Picked for you</h2><p>Based on your current profile</p></div><button className="text-button" onClick={()=>setTab("Menu & matches")}>See all dishes <span>→</span></button></div>
    <div className="dish-grid">{recommended.slice(0,3).map(item=><DishCard key={item.id} item={item} action={()=>placeOrder(item)} busy={orderBusy===item.id}/>)}</div>
    <div className="overview-bottom"><div className="panel preference-panel"><div className="panel-head"><div><div className="eyebrow">YOUR PROFILE</div><h3>Small details, better service</h3></div><button className="round-arrow" onClick={()=>setTab("My profile")}>↗</button></div><div className="preference-row"><span className="pref-icon">⌁</span><div><b>Allergy notes</b><small>{customer?.allergies?.length?customer.allergies.join(", "):"No allergies added"}</small></div><span className="pref-status">SAVED</span></div><div className="preference-row"><span className="pref-icon">◉</span><div><b>Dietary preference</b><small>{customer?.diet || "No restriction"}</small></div></div><div className="preference-row"><span className="pref-icon">✳</span><div><b>Customer status</b><small>{customer?.status || "Regular"} guest</small></div></div></div>
      <div className="panel stats-panel"><div className="panel-head"><div><div className="eyebrow">TODAY AT A GLANCE</div><h3>Service snapshot</h3></div><span className="tiny-badge">LIVE DATA</span></div><div className="stats-grid"><div><small>Orders today</small><strong>{report?.orders_count ?? 0}</strong><span className="stat-caption">Across all guests</span></div><div><small>Menu choices</small><strong>{menu.length}</strong><span className="stat-caption">Available dishes</span></div><div><small>Daily revenue</small><strong>{money(report?.revenue ?? 0)}</strong><span className="stat-caption">Completed orders</span></div><div><small>Avg. order</small><strong>{money(report?.average_order ?? 0)}</strong><span className="stat-caption">Per transaction</span></div></div><button className="report-link" onClick={()=>setTab("Operations")}>Open operations report <span>→</span></button></div></div>
  </>;
}
function DishCard({item,action,busy}:{item:MenuItem;action:()=>void;busy:boolean}) {
  const colors = ["dish-olive","dish-rose","dish-sand","dish-blue"];
  return <article className="dish-card"><div className={`dish-visual ${colors[item.id%colors.length]}`}><div className="dish-orbit"/><div className="dish-center"><span>{item.category==="Desserts"?"✳":item.category==="Salads"?"❋":"✿"}</span></div><span className="dish-category">{item.category}</span></div><div className="dish-info"><div className="dish-title-row"><h3>{item.name}</h3><b>{money(item.price)}</b></div><p>{item.description}</p><div className="tag-row">{item.diet_tags.slice(0,2).map(t=><span key={t} className="tag">{t}</span>)}</div><button className="dish-action" onClick={action} disabled={busy}>{busy?"Adding…":"Add to order"} <span>↗</span></button></div></article>;
}
function MenuView({items,recommended,search,setSearch,placeOrder,orderBusy}:{items:MenuItem[];recommended:MenuItem[];search:string;setSearch:(s:string)=>void;placeOrder:(i:MenuItem)=>void;orderBusy:number|null}) {
  const safeIds = new Set(recommended.map(i=>i.id));
  return <><PageHeading eyebrow="THE MENU" title="Good food, with context." desc="Know what's in every dish. Matches are based on the preferences saved in your profile."/><div className="menu-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search dishes or ingredients"/></label><span className="results-count">{items.length} dishes</span></div><div className="notice"><span>ⓘ</span><div><b>Allergy-aware matching is a guide, not a guarantee.</b><p>Ingredient lists may not reflect cross-contact. Please confirm with restaurant staff before ordering.</p></div></div><div className="dish-grid menu-grid">{items.map(item=><div className="dish-wrap" key={item.id}><DishCard item={item} action={()=>placeOrder(item)} busy={orderBusy===item.id}/><div className={`match-strip ${safeIds.has(item.id)?"match-ok":"match-warn"}`}>{safeIds.has(item.id)?"✓ Matches saved profile":"! Check your profile before ordering"}</div><div className="ingredients"><b>Ingredients</b><p>{item.ingredients.join(" · ")}</p>{item.allergens.length>0&&<p className="allergen-line">Declared allergens: {item.allergens.join(", ")}</p>}</div></div>)}</div></>;
}
function Profile({name,setName,allergies,setAllergies,diet,setDiet,status,setStatus,notes,setNotes,save,saved}:{name:string;setName:(s:string)=>void;allergies:string[];setAllergies:(s:string[])=>void;diet:string;setDiet:(s:string)=>void;status:string;setStatus:(s:string)=>void;notes:string;setNotes:(s:string)=>void;save:()=>void;saved:boolean}) {
  const options=["peanuts","milk","eggs","wheat","soy","sesame","fish","shellfish","tree nuts"];
  function toggle(a:string){setAllergies(allergies.includes(a)?allergies.filter(x=>x!==a):[...allergies,a]);}
  return <><PageHeading eyebrow="YOUR DETAILS" title="The things worth remembering." desc="Save your preferences once. We'll use them to highlight menu options next time."/><div className="profile-layout"><section className="panel form-panel"><div className="form-section"><div className="form-number">01</div><div className="form-content"><h3>Your details</h3><p>How the team should address you.</p><label className="field-label">Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label><label className="field-label">Customer status<select value={status} onChange={e=>setStatus(e.target.value)}><option>Regular</option><option>VIP</option><option>New guest</option><option>Staff</option></select></label></div></div><div className="form-section"><div className="form-number">02</div><div className="form-content"><h3>Allergies & sensitivities</h3><p>Select anything that the kitchen should know about. Only select what applies to you.</p><div className="allergy-grid">{options.map(a=><button type="button" key={a} onClick={()=>toggle(a)} className={`allergy-option ${allergies.includes(a)?"selected":""}`}><span>{allergies.includes(a)?"✓":"+"}</span>{a}</button>)}</div><div className="notice compact"><span>!</span><div><b>Please tell the staff directly, too.</b><p>Saved preferences are not a substitute for checking labels and cross-contact.</p></div></div></div></div><div className="form-section"><div className="form-number">03</div><div className="form-content"><h3>How you like to eat</h3><p>We can narrow down dishes based on your diet.</p><label className="field-label">Dietary preference<select value={diet} onChange={e=>setDiet(e.target.value)}><option>No restriction</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option></select></label><label className="field-label">Other preferences<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. sauces on the side, no onions…" rows={3}/></label></div></div><div className="form-footer"><span>{saved?"✓ Your changes have been saved.":"Changes apply to future recommendations."}</span><button className="button dark" onClick={save}>Save preferences <span>→</span></button></div></section><aside className="profile-aside"><div className="profile-aside-art"><div className="avatar-large">{name.split(" ").map(s=>s[0]).slice(0,2).join("")||"G"}</div><span className="aside-star">✳</span></div><div className="panel aside-panel"><div className="eyebrow">PROFILE SUMMARY</div><h3>{name||"Your name"}</h3><p>{status} guest · {diet}</p><div className="aside-divider"/><small>Saved allergy notes</small><div className="tag-row">{allergies.length?allergies.map(a=><span className="tag alert-tag" key={a}>{a}</span>):<span className="muted">None added</span>}</div><div className="aside-divider"/><small>Personal note</small><p className="note-preview">{notes||"Your extra preferences will appear here."}</p></div><p className="privacy-note">Your profile should only be visible to authorized team members. This demo does not yet include production authentication.</p></aside></div></>;
}
function Operations({report,orders,date,setDate}:{report:Report|null;orders:Order[];date:string;setDate:(s:string)=>void}) {
  return <><PageHeading eyebrow="MANAGEMENT / DAILY CLOSE" title="The day, accounted for." desc="A quick operational snapshot of orders, revenue and the most requested dishes." action={<button className="button outline" onClick={()=>window.print()}>Print report <span>↗</span></button>}/><div className="report-toolbar"><div><b>Daily report</b><small>Choose a date to review service</small></div><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div className="report-metrics"><div className="metric-card"><span>Total revenue</span><strong>{money(report?.revenue??0)}</strong><small>For selected date</small><i>↗</i></div><div className="metric-card"><span>Orders completed</span><strong>{report?.orders_count??0}</strong><small>Transactions</small><i>↗</i></div><div className="metric-card"><span>Items sold</span><strong>{report?.items_sold??0}</strong><small>Units across orders</small><i>↗</i></div><div className="metric-card"><span>Average order</span><strong>{money(report?.average_order??0)}</strong><small>Revenue per order</small><i>↗</i></div></div><div className="operations-grid"><div className="panel table-panel"><div className="panel-head"><div><h3>Order ledger</h3><p>Every recorded transaction for {date}</p></div><span className="tiny-badge">{report?.orders.length??0} RECORDS</span></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEM</th><th>QTY</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{report?.orders?.length?report.orders.map(o=><tr key={o.id}><td>#{String(o.id).padStart(4,"0")}</td><td>{o.customer}</td><td>{o.item}</td><td>{o.quantity}</td><td>{money(o.total)}</td><td><span className="status-pill">{o.status}</span></td></tr>):<tr><td colSpan={6} className="empty-cell">No orders recorded for this date.</td></tr>}</tbody></table></div><div className="table-foot">Generated from order records · {date}</div></div><div className="panel popular-panel"><div className="eyebrow">WHAT PEOPLE ORDERED</div><h3>Most popular</h3><p className="subtext">Ranked by number of units sold.</p>{report?.top_items?.length?report.top_items.slice(0,5).map((item,i)=><div className="popular-row" key={item.name}><span className="rank">{String(i+1).padStart(2,"0")}</span><div className="popular-name"><b>{item.name}</b><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(12,item.quantity/Math.max(...report.top_items.map(t=>t.quantity))*100)}%`}}/></div></div><span className="popular-qty">{item.quantity}</span></div>):<p className="empty-cell">No item data for this date.</p>}<div className="report-note"><b>Manager's note</b><p>Use this report for a first review. Taxes, refunds, payment reconciliation and inventory are not included in this demo.</p></div></div></div></>;
}
function Customers({customers,setTab}:{customers:Customer[];setTab:(s:string)=>void}) {
  return <><PageHeading eyebrow="GUEST BOOK" title="Good service remembers." desc="A quick view of saved guest preferences and service notes."/><div className="panel customer-panel"><div className="panel-head"><div><h3>Customer directory</h3><p>Demo records in the system</p></div><span className="tiny-badge">{customers.length} GUESTS</span></div><div className="customer-list">{customers.map(c=><div className="customer-row" key={c.id}><div className="avatar">{c.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div><div className="customer-main"><b>{c.name}</b><small>{c.email}</small></div><div className="customer-pref"><small>ALLERGIES</small><span>{c.allergies.length?c.allergies.join(", "):"None saved"}</span></div><div className="customer-pref"><small>DIET</small><span>{c.diet}</span></div><span className={`customer-status ${c.status==="VIP"?"vip":""}`}>{c.status}</span>{c.id===1&&<button className="round-arrow" onClick={()=>setTab("My profile")}>↗</button>}</div>)}</div></div><div className="notice customer-notice"><span>ⓘ</span><div><b>Customer privacy matters.</b><p>Real customer and allergy information should only be accessible to authorized staff. Add authentication and permissions before production use.</p></div></div></>;
}
