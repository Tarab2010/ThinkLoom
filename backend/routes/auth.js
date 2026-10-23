import {Router} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import requireauth from '../middleware/auth.js';

const router= Router();
const cookieOptions={
    httpOnly:true,
    sameSite:'lax',
    secure:process.env.NODE_ENV==='production',
    maxAge:7*24*60*60*1000
}
function SetSession(res,userId){
    const token=jwt.sign({id:userId},process.env.JWT_SECRET,{expiresIn:'7d'});
    res.cookie('token',token,cookieOptions);
}
const publicuser=(u)=>({id:u._id, name:u.name, email:u.email});
router.post('/signup',async(req,res)=>{
    const name=String(req.body.name||'').trim();
    const email=String(req.body.email||'').trim().toLocaleLowerCase();
    const password=String(req.body.password||'');
    if(!name){
        return res.status(404).json({error:'a name is required'});
    }
    if(!email){
        return res.status(404).json({error:'an email is required'});
    }
    if(!password){
        return res.status(404).json({error:'password is not set'})
    }
    if(password.length<8){
        return res.status(404).json({error:'password needs to be atleast 8 characters long'})
    }
    if(await User.findOne({email})){
         return res.status(404).json({error:'this email is already registered'});
    }
    const passwordHash=await bcrypt.hash(password,10);
    const user=await User.create({name,email,passwordHash});
    SetSession(res, user.id);
    res.status(201).json(publicuser(user));
})
router.post('/login', async(req,res)=>{
    const {email,password}=req.body;
    const user=await User.findOne({email: (email||'').toLowerCase()});
    if(!user){
        return res.status(401).json({error:'invalid email'});
    }
    if(!(await bcrypt.compare(password || '', user.passwordHash))){
        return res.status(401).json({error:'invalid password'})        
    }
    SetSession(res,user.id);
    res.json(publicuser(user));
});
router.post('/logout',async(req,res)=>{
    res.clearCookie('token',cookieOptions);
    res.json({ok:true});
});
router.get('/me',requireauth,async (req,res)=>{
    const user=await User.findById(req.userId);
    if(!user){
        return res.status(401).json({error:'user not found'});
    }
    res.json(publicuser(user));
})
export default router;