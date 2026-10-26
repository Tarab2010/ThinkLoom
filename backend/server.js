import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import ideaRoutes from './routes/ideas.js'
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import meetingRoutes from './routes/meetings.js';
import callRouter from './routes/calls.js'
import { connectDB } from './config/db.js';
import { initSockets } from './sockets/meetingSocket.js';
import canvasFileRoutes from './routes/canvasFiles.js';
const app=express();
app.set('trust proxy',1);
const server=http.createServer(app);
app.set('io',initSockets(server));
app.use(cors({origin:process.env.CLIENT_URL, credentials:true}));
app.use(express.json());
app.use(cookieParser());
app.get('/api/health',(req,res)=>{
    res.json({ok:true});
})
app.use('/api/projects/:projectId/meetings/:meetingId/calls',(req, res, next) => {
  next();
},callRouter);
app.use('/api/auth', authRoutes);
app.use('/api/projects',projectRoutes);
app.use('/api/projects/:projectId/meetings/:meetingId/ideas',ideaRoutes);
app.use('/api/projects/:projectId/meetings/:meetingId/canvas-files',canvasFileRoutes);
app.use('/api/projects/:projectId/meetings',meetingRoutes);
app.use((err,_req,res,_next)=>{
    if(err.name==='ValidationError' || err.name==='CastError'){
        return res.status(400).json({error:err.message})
    }
    console.log(err);
    res.status(500).json({error:'Server Error'});
})

const port=process.env.PORT ||5000;
connectDB().then(()=>server.listen(port,()=>console.log(`Api running on ${port}`)))
.catch((err)=>{console.error('Could not start:',err.message);
    process.exit(1);
})
