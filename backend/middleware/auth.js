import jwt from 'jsonwebtoken';

export default function requireauth(req,res,next){
    const token=req.cookies.token;
    if(!token){
        return res.status(401).json({error:'Not Authenticated'});
    }
    try{
        req.userId=jwt.verify(token,process.env.JWT_SECRET).id;
        next();
    }
    catch(err){
        console.log(err.message)
        res.status(401).json({error:'Invalid or expired session'});
    }
}