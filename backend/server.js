import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import { connectDB } from './config/db.js';
const app=express();
app.use(cors({origin:process.env.CLIENT_URL, credentials:true}));
app.use(express.json());
app.use(cookieParser());
app.get('/api/health',(req,res)=>{
    res.json({ok:true});
})
app.use('/api/auth', authRoutes);
app.use('/api/projects',projectRoutes)
app.use((err,_req,res,_next)=>{
    if(err.name==='ValidationError' || err.name==='CasteError'){
        return res.status(400).json({error:err.message})
    }
    console.log(err);
    res.status(500).json({error:'Server Error'});
})

const port=process.env.PORT ||5000;
connectDB().then(()=>app.listen(port,()=>console.log(`Api running on ${port}`)))
