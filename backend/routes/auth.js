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