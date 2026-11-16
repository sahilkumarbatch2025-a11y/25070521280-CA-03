import React,{useEffect,useMemo,useState}from'react';
import axios from'axios';
import{ChefHat,Utensils,ShoppingBag,LogIn,LogOut,Plus,Minus,Trash2,ClipboardList,LayoutDashboard,Users,BarChart3,Receipt,ArrowRight,CheckCircle2,X,ShieldCheck,Activity}from'lucide-react';
const api=axios.create({baseURL:'http://localhost:5000/api'});
api.interceptors.request.use(c=>{const t=localStorage.getItem('nx_token');if(t)c.headers.Authorization=`Bearer ${t}`;return c});
const cats=['All','Starters','Main Course','Breads','Desserts','Beverages'],money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const pics={'Paneer Tikka':'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700','Crispy Corn':'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=700','Paneer Makhani':'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700','Dal Bukhara':'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700','Veg Biryani':'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=700','Butter Naan':'https://images.unsplash.com/photo-1600628422019-7f3f7b7a4c9d?w=700','Gulab Jamun':'https://images.unsplash.com/photo-1666190092159-4f8e2c9a3d9e?w=700','Mango Lassi':'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=700'};
export default function App(){
 const[user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('nx_user')||'null')}catch{return null}}),[page,setPage]=useState('menu'),[menu,setMenu]=useState([]),[orders,setOrders]=useState([]),[cart,setCart]=useState([]),[cat,setCat]=useState('All'),[modal,setModal]=useState(''),[form,setForm]=useState({mode:'login'}),[toast,setToast]=useState(''),[summary,setSummary]=useState({orders:0,users:0,menuItems:0,revenue:0}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
 const note=m=>{setToast(m);clearTimeout(note.t);note.t=setTimeout(()=>setToast(''),3000)};
 const load=async()=>{try{await api.get('/health');setReady(true);setMenu((await api.get(user?.role==='admin'?'/admin/menu':'/menu')).data);if(user)setOrders((await api.get(user.role==='customer'?'/orders/mine':'/orders')).data);if(user?.role==='admin')setSummary((await api.get('/admin/summary')).data)}catch{setReady(false)}};
 useEffect(()=>{
  let alive=true, timer;
  const connect=async()=>{
    try{
      await api.get('/health');
      if(!alive)return;
      setReady(true);
      const menuData=await api.get(user?.role==='admin'?'/admin/menu':'/menu');
      if(!alive)return;
      setMenu(menuData.data);
      if(user){
        const orderData=await api.get(user.role==='customer'?'/orders/mine':'/orders');
        if(alive)setOrders(orderData.data);
      }
      if(user?.role==='admin'){
        const summaryData=await api.get('/admin/summary');
        if(alive)setSummary(summaryData.data);
      }
    }catch{
      if(!alive)return;
      setReady(false);
      timer=window.setTimeout(connect,2500);
    }
  };
  connect();
  return()=>{alive=false;window.clearTimeout(timer)};
},[user]);
 const filtered=useMemo(()=>menu.filter(x=>cat==='All'||x.category===cat),[menu,cat]),count=cart.reduce((s,x)=>s+x.quantity,0),total=cart.reduce((s,x)=>s+x.price*x.quantity,0);
 const add=x=>{setCart(old=>old.some(a=>a._id===x._id)?old.map(a=>a._id===x._id?{...a,quantity:a.quantity+1}:a):[...old,{...x,quantity:1}]);note('Added to cart')};
 const qty=(id,d)=>setCart(old=>old.map(x=>x._id===id?{...x,quantity:Math.max(0,x.quantity+d)}:x).filter(x=>x.quantity));
 const auth=async e=>{e.preventDefault();setBusy(true);try{const{data}=await api.post(form.mode==='register'?'/auth/register':'/auth/login',form);localStorage.setItem('nx_token',data.token);localStorage.setItem('nx_user',JSON.stringify(data.user));setUser(data.user);setModal('');setPage('menu');note('Welcome to NexaServe')}catch(e){note(e.response?.data?.message||'Sign-in failed')}finally{setBusy(false)}};
 const logout=()=>{localStorage.removeItem('nx_token');localStorage.removeItem('nx_user');setUser(null);setOrders([]);setCart([]);setPage('menu');note('Signed out')};
 const place=async()=>{if(!user){setForm({mode:'login'});setModal('auth');return}try{await api.post('/orders',{items:cart.map(x=>({menuItemId:x._id,quantity:x.quantity}))});setCart([]);setModal('');await load();setPage('orders');note('Order placed')}catch(e){note(e.response?.data?.message||'Order failed')}};
 const status=async(id,s)=>{try{await api.patch(`/orders/${id}/status`,{status:s});await load();note('Order updated')}catch{note('Could not update order')}};
 const bill=async id=>{try{const{data}=await api.post(`/orders/${id}/bill`);await load();note(`Bill ${data.billNumber} generated`)}catch{note('Bill generation failed')}};
 const save=async e=>{e.preventDefault();try{const payload={...form,price:Number(form.price)};if(form._id)await api.put(`/admin/menu/${form._id}`,payload);else await api.post('/admin/menu',payload);setModal('');await load();note('Menu item saved')}catch(e){note(e.response?.data?.message||'Save failed')}};
 const del=async id=>{if(!confirm('Delete this menu item?'))return;try{await api.delete(`/admin/menu/${id}`);await load();note('Item deleted')}catch{note('Delete failed')}};
 const nav=[['menu','Menu',Utensils,true],['orders',user?.role==='customer'?'My orders':'Orders',ClipboardList,!!user],['manage','Manage menu',Utensils,user?.role==='admin'],['dashboard','Dashboard',LayoutDashboard,user?.role==='admin']];
 return <div className="app">
 <header className="top"><button className="brand" onClick={()=>setPage('menu')}><i><ChefHat/></i><span>NEXA<span>SERVE</span><small>RESTAURANT OPERATIONS</small></span></button><nav>{nav.filter(x=>x[3]).map(([id,label,I])=><button className={page===id?'nav active':'nav'} key={id} onClick={()=>setPage(id)}><I size={16}/>{label}</button>)}</nav><div className="right">{user?<><span className="who">{user.name.split(' ')[0]}<small>{user.role}</small></span><button className="icon" onClick={logout}><LogOut/></button></>:<button className="light" onClick={()=>{setForm({mode:'login'});setModal('auth')}}><LogIn size={15}/> Sign in</button>}<button className="cart" onClick={()=>setModal('cart')}><ShoppingBag size={16}/> Cart {count>0&&<b>{count}</b>}</button></div></header>
 {!ready&&<div className="warning"><Activity size={14}/> Connecting to backend. Keep START.bat open and refresh if this persists.</div>}
 <main>
 {page==='menu'&&<><section className="hero"><div><label>● &nbsp; SMARTER RESTAURANT OPERATIONS</label><h1>Great food.<br/><em>Seamless service.</em></h1><p>Manage your menu, orders and service workflow from one simple workspace.</p><button className="primary" onClick={()=>document.getElementById('menu')?.scrollIntoView({behavior:'smooth'})}>Explore menu <ArrowRight size={16}/></button><small><ShieldCheck size={14}/> Secure · Simple · Streamlined</small></div><img src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1200" alt="Restaurant food"/></section>
 <section className="section" id="menu"><div className="heading"><div><label>CURATED FOR YOU</label><h2>Explore the menu</h2></div><p>Thoughtful ingredients. Familiar favourites.</p></div><div className="tabs">{cats.map(x=><button className={cat===x?'chosen':''} key={x} onClick={()=>setCat(x)}>{x}</button>)}</div><div className="grid">{filtered.map(x=><article className="food" key={x._id}><div className="photo"><img src={pics[x.name]||'https://images.unsplash.com/photo-1547592180-85f173990554?w=700'} alt={x.name}/><span>{x.category}</span></div><div className="foodbody"><h3>{x.name}</h3><p>{x.description}</p><div><b>{money(x.price)}</b>{user?.role==='admin'?<button className="add" onClick={()=>{setForm(x);setModal('menu')}}>Edit</button>:<button className="add" onClick={()=>add(x)}><Plus size={14}/> Add</button>}</div></div></article>)}</div>{ready&&!filtered.length&&<p className="empty">No items in this category.</p>}</section></>}
 {page==='orders'&&<section className="section workspace"><div className="heading"><div><label>ORDER WORKSPACE</label><h2>{user?.role==='customer'?'Your orders':'Orders & kitchen queue'}</h2></div></div><OrderList orders={orders} user={user} status={status} bill={bill}/></section>}
 {page==='manage'&&<section className="section workspace"><div className="heading"><div><label>CATALOGUE CONTROL</label><h2>Menu management</h2></div><button className="primary" onClick={()=>{setForm({category:'Main Course',available:true});setModal('menu')}}><Plus size={15}/> Add item</button></div><div className="manage">{menu.map(x=><div key={x._id}><b>{x.name}</b><small>{x.category} · {money(x.price)}</small><button className="light" onClick={()=>{setForm(x);setModal('menu')}}>Edit</button><button className="icon red" onClick={()=>del(x._id)}><Trash2 size={16}/></button></div>)}</div></section>}
 {page==='dashboard'&&<section className="section workspace"><label>BUSINESS OVERVIEW</label><h2>Welcome back, {user?.name.split(' ')[0]}.</h2><div className="metrics">{[['Orders',summary.orders,ClipboardList],['Users',summary.users,Users],['Menu items',summary.menuItems,Utensils],['Revenue',money(summary.revenue),BarChart3]].map(([l,v,I])=><div key={l}><I/><small>{l}</small><b>{v}</b></div>)}</div><h2 className="sub">Recent orders</h2><OrderList orders={orders.slice(0,5)} user={user} status={status} bill={bill}/></section>}
 </main><footer><b>NEXASERVE</b><p>Less friction. Better service. Happier tables.</p><small>© 2026 NexaServe · Restaurant Management System</small></footer>
 {toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
 {modal&&<div className="shade" onMouseDown={e=>e.target===e.currentTarget&&setModal('')}><div className="modal"><button className="close" onClick={()=>setModal('')}><X/></button>
 {modal==='auth'&&<><label>YOUR NEXASERVE ACCOUNT</label><h2>{form.mode==='register'?'Create account':'Welcome back'}</h2><form onSubmit={auth} className="fields">{form.mode==='register'&&<input required placeholder="Full name" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/>}<input required type="email" placeholder="Email address" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/><input required minLength="6" type="password" placeholder="Password" value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})}/><button className="primary" disabled={busy}>{busy?'Please wait':'Continue'} <ArrowRight size={15}/></button></form><p className="switch">{form.mode==='register'?'Already registered?':'New here?'} <button onClick={()=>setForm({...form,mode:form.mode==='register'?'login':'register'})}>{form.mode==='register'?'Sign in':'Create account'}</button></p><p className="demo">Admin demo: admin@nexaserve.local / Admin@123</p></>}
 {modal==='cart'&&<><label>YOUR SELECTION</label><h2>Shopping cart</h2>{!cart.length?<p className="empty">Your cart is empty.</p>:<>{cart.map(x=><div className="cartline" key={x._id}><span>{x.name}<small>{money(x.price)} each</small></span><div><button onClick={()=>qty(x._id,-1)}><Minus size={13}/></button>{x.quantity}<button onClick={()=>qty(x._id,1)}><Plus size={13}/></button></div></div>)}<div className="total"><span>Total</span><b>{money(total)}</b></div><button className="primary full" onClick={place}>Place order <ArrowRight size={15}/></button></>}</>}
 {modal==='menu'&&<><label>CATALOGUE EDITOR</label><h2>{form._id?'Edit menu item':'Add menu item'}</h2><form className="fields" onSubmit={save}><input required placeholder="Item name" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/><textarea placeholder="Description" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/><select value={form.category||'Main Course'} onChange={e=>setForm({...form,category:e.target.value})}>{cats.slice(1).map(x=><option key={x}>{x}</option>)}</select><input required type="number" min="0" placeholder="Price in INR" value={form.price??''} onChange={e=>setForm({...form,price:e.target.value})}/><label className="check"><input type="checkbox" checked={form.available!==false} onChange={e=>setForm({...form,available:e.target.checked})}/> Available to customers</label><button className="primary">Save item</button></form></>}
 </div></div>}
 </div>
}
function OrderList({orders,user,status,bill}){if(!orders.length)return <div className="emptybox"><ClipboardList/><h3>No orders yet</h3><p>Orders appear here when customers place them.</p></div>;return <div className="orders">{orders.map(o=><article key={o._id}><div className="orderhead"><div><label>ORDER #{o._id.slice(-7).toUpperCase()}</label><h3>{o.customerName}</h3><small>{new Date(o.createdAt).toLocaleString()}</small></div><span className={'state '+o.status.toLowerCase()}>{o.status}</span></div><div className="lines">{o.items.map((x,i)=><p key={i}><span>{x.quantity} × {x.name}</span><b>{money(x.price*x.quantity)}</b></p>)}</div><div className="orderfoot"><strong>{money(o.total)}</strong>{o.billNumber&&<small><Receipt size={13}/> {o.billNumber}</small>}{user?.role!=='customer'&&<div><select value={o.status} onChange={e=>status(o._id,e.target.value)}>{['Placed','Preparing','Ready','Completed','Cancelled'].map(x=><option key={x}>{x}</option>)}</select><button className="light" onClick={()=>bill(o._id)}>Generate bill</button></div>}</div></article>)}</div>}
