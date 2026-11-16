import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express(), here = path.dirname(fileURLToPath(import.meta.url));
const SECRET = 'nexaserve-local-demo-secret-change-before-production';
app.use(cors({origin:['http://localhost:5173','http://127.0.0.1:5173']}));
app.use(express.json());

const User = mongoose.model('User', new mongoose.Schema({
 name:{type:String,required:true}, email:{type:String,unique:true,required:true,lowercase:true},
 password:{type:String,required:true}, role:{type:String,enum:['admin','staff','customer'],default:'customer'}
},{timestamps:true}));
const Menu = mongoose.model('Menu',new mongoose.Schema({
 name:{type:String,required:true},description:String,category:String,price:{type:Number,min:0,required:true},available:{type:Boolean,default:true}
},{timestamps:true}));
const Order = mongoose.model('Order',new mongoose.Schema({
 customerId:{type:mongoose.Schema.Types.ObjectId,ref:'User'},customerName:String,
 items:[{name:String,price:Number,quantity:Number}],total:Number,
 status:{type:String,default:'Placed'},billNumber:String,billedAt:Date
},{timestamps:true}));

const wrap = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const token = u => jwt.sign({id:String(u._id),name:u.name,email:u.email,role:u.role},SECRET,{expiresIn:'7d'});
const safe = u => ({id:String(u._id),name:u.name,email:u.email,role:u.role});
function auth(req,res,next){
 const t=(req.headers.authorization||'').replace(/^Bearer /,'');
 try{req.user=jwt.verify(t,SECRET);next()}catch{return res.status(401).json({message:'Please sign in again.'})}
}
const permit=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:'Access denied.'});

app.get('/api/health',(req,res)=>res.json({ok:true,database:mongoose.connection.readyState===1?'connected':'disconnected'}));
app.post('/api/auth/register',wrap(async(req,res)=>{
 const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
 if(!name||!email.includes('@')||password.length<6)return res.status(400).json({message:'Enter name, valid email and password (6+ characters).'});
 if(await User.findOne({email}))return res.status(409).json({message:'Email already registered.'});
 const u=await User.create({name,email,password:await bcrypt.hash(password,10)});
 res.status(201).json({token:token(u),user:safe(u)});
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
 const u=await User.findOne({email:String(req.body.email||'').toLowerCase()});
 if(!u||!await bcrypt.compare(String(req.body.password||''),u.password))return res.status(401).json({message:'Incorrect email or password.'});
 res.json({token:token(u),user:safe(u)});
}));
app.get('/api/menu',wrap(async(req,res)=>res.json(await Menu.find({available:true}).sort({category:1,name:1}))));
app.get('/api/admin/menu',auth,permit('admin'),wrap(async(req,res)=>res.json(await Menu.find().sort({name:1}))));
app.post('/api/admin/menu',auth,permit('admin'),wrap(async(req,res)=>{
 const item=await Menu.create({...req.body,price:Number(req.body.price)});res.status(201).json(item);
}));
app.put('/api/admin/menu/:id',auth,permit('admin'),wrap(async(req,res)=>{
 const item=await Menu.findByIdAndUpdate(req.params.id,{...req.body,price:Number(req.body.price)},{new:true,runValidators:true});
 if(!item)return res.status(404).json({message:'Menu item not found.'});res.json(item);
}));
app.delete('/api/admin/menu/:id',auth,permit('admin'),wrap(async(req,res)=>{
 const item=await Menu.findByIdAndDelete(req.params.id);if(!item)return res.status(404).json({message:'Not found.'});res.json({ok:true});
}));
app.post('/api/orders',auth,permit('customer'),wrap(async(req,res)=>{
 if(!Array.isArray(req.body.items)||!req.body.items.length)return res.status(400).json({message:'Cart is empty.'});
 const ids=req.body.items.map(x=>x.menuItemId),docs=await Menu.find({_id:{$in:ids},available:true});
 const items=req.body.items.map(row=>{const m=docs.find(x=>String(x._id)===String(row.menuItemId));return m?{name:m.name,price:m.price,quantity:Math.max(1,Math.min(25,Number(row.quantity)||1))}:null});
 if(items.some(x=>!x))return res.status(400).json({message:'A menu item is unavailable. Refresh the menu.'});
 const total=items.reduce((s,x)=>s+x.price*x.quantity,0);
 res.status(201).json(await Order.create({customerId:req.user.id,customerName:req.user.name,items,total}));
}));
app.get('/api/orders/mine',auth,permit('customer'),wrap(async(req,res)=>res.json(await Order.find({customerId:req.user.id}).sort({createdAt:-1}))));
app.get('/api/orders',auth,permit('staff','admin'),wrap(async(req,res)=>res.json(await Order.find().sort({createdAt:-1}))));
app.patch('/api/orders/:id/status',auth,permit('staff','admin'),wrap(async(req,res)=>{
 const allowed=['Placed','Preparing','Ready','Completed','Cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid status.'});
 const o=await Order.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true});if(!o)return res.status(404).json({message:'Order not found.'});res.json(o);
}));
app.post('/api/orders/:id/bill',auth,permit('staff','admin'),wrap(async(req,res)=>{
 const o=await Order.findById(req.params.id);if(!o)return res.status(404).json({message:'Order not found.'});
 if(!o.billNumber){o.billNumber='NX-'+Date.now().toString().slice(-8);o.billedAt=new Date();await o.save()}res.json(o);
}));
app.get('/api/admin/summary',auth,permit('admin'),wrap(async(req,res)=>{
 const [orders,users,menuItems,revenue]=await Promise.all([Order.countDocuments(),User.countDocuments(),Menu.countDocuments(),Order.aggregate([{$match:{status:{$ne:'Cancelled'}}},{$group:{_id:null,total:{$sum:'$total'}}}])]);
 res.json({orders,users,menuItems,revenue:revenue[0]?.total||0});
}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({message:err.message||'Server error.'})});

async function seed(){
 for(const [name,email,password,role] of [
 ['NexaServe Administrator','admin@nexaserve.local','Admin@123','admin'],
 ['Restaurant Staff','staff@nexaserve.local','Staff@123','staff'],
 ['Demo Customer','customer@nexaserve.local','Customer@123','customer']]){
  if(!await User.exists({email}))await User.create({name,email,password:await bcrypt.hash(password,10),role});
 }
 if(!await Menu.countDocuments())await Menu.insertMany([
  {name:'Paneer Tikka',description:'Char-grilled paneer with house spices and mint yoghurt.',category:'Starters',price:269},
  {name:'Crispy Corn',description:'Golden corn tossed with herbs and chilli.',category:'Starters',price:189},
  {name:'Paneer Makhani',description:'Paneer in a rich tomato and cashew gravy.',category:'Main Course',price:329},
  {name:'Dal Bukhara',description:'Slow-cooked black lentils finished with butter.',category:'Main Course',price:299},
  {name:'Veg Biryani',description:'Fragrant basmati rice with seasonal vegetables.',category:'Main Course',price:279},
  {name:'Butter Naan',description:'Tandoor-baked naan brushed with butter.',category:'Breads',price:59},
  {name:'Gulab Jamun',description:'Warm milk dumplings in cardamom syrup.',category:'Desserts',price:99},
  {name:'Mango Lassi',description:'Chilled yoghurt blended with ripe mango.',category:'Beverages',price:119}
 ]);
}
async function start(){
 const dataDir=path.resolve(here,'../data');fs.mkdirSync(dataDir,{recursive:true});
 console.log('[DB] Starting local MongoDB (first run may download its binary)...');
 const mongo=await MongoMemoryServer.create({instance:{dbPath:dataDir,storageEngine:'wiredTiger'}});
 await mongoose.connect(mongo.getUri(),{dbName:'nexaserve'});await seed();
 app.listen(5000,'127.0.0.1',()=>console.log('[API] http://localhost:5000 — MongoDB connected.'));
}
start().catch(e=>{console.error('[FATAL] Backend startup failed:',e);process.exit(1)});
