import {Server} from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Meeting from '../models/Meetings.js';
import CanvasVersion from '../models/CanvasVersion.js';
import { isNewer } from '../lib/mergeElements.js';
import { effectiverole } from '../middleware/meetingrole.js';
import {createRequire} from 'module';
const {parse}=createRequire(import.meta.url)('cookie')
import Meetings from '../models/Meetings.js';

const MAX_ELEMENTS=5000;
const MAX_PER_UPDATE=1000;
const SAVE_EVERY_MS=2000;
const COOKIE_NAMES=['thinkloontoken','token'];
const roomName=(meetingId)=>`meeting:${meetingId}`;
const rooms=new Map();
async function loadroom(meetingId){
    const existing=rooms.get(meetingId);
    if(existing){
        return existing;
    }
    const saved= await CanvasVersion.findOne({meeting:meetingId});
    const again=rooms.get(meetingId);
    if(again){
        return again;
    }
    const room={
        elements:new Map((saved? saved.toObject().elements:[]).map((el)=>[el.id,el])),
        dirty:false,
        timer:null,
        saving:null,
        lastEditor:null
    };
    rooms.set(meetingId,room);
    return room;
}
function saveRoom(meetingId){
    const room=rooms.get(meetingId);
    if(!room){
        return Promise.resolve();
    }
    clearTimeout(room.timer);
    room.timer=null;
    room.saving=(room.saving??Promise.resolve()).then(async()=>{
        if(!room.dirty){
            return;
        }
        room.dirty=false;
        try{
            await CanvasVersion.findOneAndUpdate(
                {meeting:meetingId},
                {elements:[...room.elements.values()],updatedBy:room.lastEditor},
                {upsert:true}
            );
        }
        catch(err){
            room.dirty=true;
        }
    });
    return room.saving;
}
function scheduleSave(meetingId,room){
    room.dirty=true;
    if(room.timer){
        return ;
    }
    room.timer=setTimeout(()=>{
        room.timer=null;
        saveRoom(meetingId);
    },SAVE_EVERY_MS);
}
export function flushMeetingCanvas(meetingId){
    return saveRoom(String(meetingId));
}
const validElement=(el)=>
    el && typeof el==='object' &&
    typeof el.id==='string' &&
    el.id.length<=64 &&
    typeof el.type==='string' &&
    Number.isFinite(el.version);

async function broadcastPresence(io,meetingId){
    const sockets=await io.in(roomName(meetingId)).fetchSockets();
    const users=sockets.map((s)=>({
        socketId:s.id,
        userId:s.data.user.id,
        name:s.data.user.name,
        role:s.data.role
    }))
    io.to(roomName(meetingId)).emit('presence',users);
}
async function afterLeave(io,meetingId){
    await broadcastPresence(io,meetingId);
    const remaining=await io.in(roomName(meetingId)).fetchSockets();
    if(remaining.length===0){
        await saveRoom(meetingId);
        const again=await io.in(roomName(meetingId)).fetchSockets();
        const room=rooms.get(meetingId);
        if(again.length===0 && room && !room.dirty){
            rooms.delete(meetingId);
        }
    }
}

async function leaveMeeting(io,socket){
    const {meetingId}=socket.data;
    if(!meetingId){
        return ;
    }
    socket.leave(roomName(meetingId));
    socket.data.meetingId=null;
    await afterLeave(io,meetingId);
}
export async function refreshMeetingRoles(io,meetingId){
    if(!io){
        return ;
    }
    try{
        const sockets= await io.in(roomName(meetingId)).fetchSockets();
        for(const s of sockets){
            const membership=await Membership.findOne({
                project:s.data.projectId,
                user:s.data.user.id
            });
            if(!membership){
                continue;
            }
            const role=await effectiverole(membership,meetingId);
            s.data.role=role;
            s.emit('meeting:role',{role});
        }
        await broadcastPresence(io,meetingId);
    }
    catch(err){
        console.error('Could not refresh roles', err.message);
    }
}
export function initSockets(server){
    const io=new Server(server,{
        cors:{origin:process.env.CLIENT_URL,credentials:true},
        maxHttpBufferSize:2e6,
    })
    io.use(async (socket,next)=>{
        try{
            const cookies=parse(socket.handshake.headers.cookie ||'');
            const token=COOKIE_NAMES.map((name)=>cookies[name]).find(Boolean);
            if(!token){
                return next(new Error('Not Authenticated'));
            }
            const {id}=jwt.verify(token,process.env.JWT_SECRET);
            const user=await User.findById(id).select('name');
            if(!user){
                return next(new Error('Nor authenticated'));
            }
            socket.data.user={id:String(user._id),name:user.name};
            next();
        }
        catch{
            next(new Error('not authenticated'));
        }
    })
    io.on('connection',(socket)=>{
        socket.on('meeing:join',async(payload,ack)=>{
            const reply=typeof ack==='function'?ack:()=>{};
            try{
                const{projectId,meetingId}=payload||{};
                if(!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(meetingId)){
                    return reply({error:'Meeting not found'});
                }
                const membership=await Membership.findOne({
                    project:projectId,
                    user:socket.data.user.id
                });
                const meeting=membership ? await Meeting.findOne({_id:meetingId,project:projectId}):null;
                if(!membership || !meeting){
                    return reply({error:'Meeting not found'});
                }
                const role=await effectiverole(membership,meeting);
                const room=await loadroom(meetingId);
                if(socket.data.meetingId && socket.data.meetingId!=meetingId){
                    await leaveMeeting(io,socket);
                }
                socket.data.projectId=projectId;
                socket.data.meetingId=meetingId;
                socket.data.role=role;
                socket.join(roomName(meetingId));
                reply({ok:true,role,elements:[...room.elements.values()]});
                await broadcastPresence(io,meetingId);
            }
            catch(err){
                console.error('meeting:join failed',err.message);
                reply({error:'Could not join the meeting'});
            }
        });
        socket.on('scene:update',async(payload)=>{
            try{
                const{meetingId,role,user}=socket.data;
                if(!meetingId){
                    return;
                }
                if(role!=='leader' && role!=='editor'){
                    socket.emit('meeting:error',{message:'you can only view this canva'});
                    return;
                }
                const elements=payload?.elements;
                if(!Array.isArray(elements) || elements.length===0 ||elements.length>MAX_PER_UPDATE){
                    return;
                }
                if(!elements.every(validElement)){
                    return;
                }
                const room =loadroom(meetingId);
                const accepted=[];
                for(const el of elements){
                    const existing=room.elements.get(el.id);
                    if(!existing && room.elements.size> MAX_ELEMENTS){
                        continue;
                    }
                    if(isNewer(el,existing)){
                        room.elemnts.set(el.id,el);
                        accepted.push(el);
                    }
                }
                if(accepted.length===0){
                    return;
                }
                room.lastEditor=user.id;
                socket.to(roomName(meetingId).emit('scene:update',{elements:accepted}));
                scheduleSave(meetingId,room);
            }
            catch(err){
                console.error('scne:update failed',err.message);
            }
        });
        socket.on('pointer:update',(payload)=>{
            const {meetingId,user}=socket.data;
            const pointer=payload?.pointer;
            if(!meetingId || !pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)){
                return;
            }
            socket.to(roomName(meetingId).volatile.emit('pointer:update',{
                socketId:socket.id,
                userName:user.name,
                pointer:{x:pointer.x, y:pointer.y,tool:pointer.tool==='laser'?'laser':'pointer'},
                button:payload.button==='down'?'down':'up'
            }))
        });
        socket.on('disconnect',()=>{
            const {meetingId}=socket.data;
            if(meetingId){
                afterLeave(io,meetingId).catch((err)=>console.error(err.message));
            }
        });
    });
    return io;
}