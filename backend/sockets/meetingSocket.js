import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import {presenting} from '../lib/presenting.js'
import Meeting from '../models/Meetings.js';
import CanvasVersion from '../models/CanvasVersion.js';
import { meetingStatus } from '../lib/meetingStatus.js';
import MeetingAdmission from '../models/MeetingAdmission.js';
import { isNewer } from '../lib/mergeElements.js';
import { effectiverole } from '../middleware/meetingrole.js';
import Meetings from '../models/Meetings.js';

function readCookies(header = '') {
    const out = {};
    for (const part of header.split(';')) {
        const i = part.indexOf('=');
        if (i < 0) {
            continue;
        }
        const name = part.slice(0, i).trim();
        if (!name) {
            continue;
        }
        let value = part.slice(i + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        try {
            out[name] = decodeURIComponent(value);
        }
        catch { out[name] = value }
    }
    return out;
}
const MAX_ELEMENTS = 5000;
const MAX_PER_UPDATE = 1000;
const SAVE_EVERY_MS = 2000;
const lobbyRoom = (id) => `lobby:${id}`;
const leaderRoom = (id) => `leader:${id}`;
const COOKIE_NAMES = ['token'];
const roomName = (meetingId) => `meeting:${meetingId}`;
export const ideasRoom = (meetingId) => `ideas:${meetingId}`;
export const projectRoom = (projectId) => `projects:${projectId}`;
const rooms = new Map();
async function broadcastLobby(io, meetingId) {
    const sockets = await io.in(lobbyRoom(meetingId)).fetchSockets();
    const seen = new Map();
    for (const s of sockets) {
        seen.set(s.data.user.id, { userId: s.data.user.id, name: s.data.user.name });
    }
    io.to(leaderRoom(meetingId)).emit('lobby:update', [...seen.values()]);
}
async function loadroom(meetingId) {
    const existing = rooms.get(meetingId);
    if (existing) {
        return existing;
    }
    const saved = await CanvasVersion.findOne({ meeting: meetingId });
    const again = rooms.get(meetingId);
    if (again) {
        return again;
    }
    const room = {
        elements: new Map((saved ? saved.toObject().elements : []).map((el) => [el.id, el])),
        dirty: false,
        timer: null,
        saving: null,
        lastEditor: null
    };
    rooms.set(meetingId, room);
    return room;
}
function saveRoom(meetingId) {
    const room = rooms.get(meetingId);
    if (!room) {
        return Promise.resolve();
    }
    clearTimeout(room.timer);
    room.timer = null;
    room.saving = (room.saving ?? Promise.resolve()).then(async () => {
        if (!room.dirty) {
            return;
        }
        room.dirty = false;
        try {
            await CanvasVersion.findOneAndUpdate(
                { meeting: meetingId },
                { elements: [...room.elements.values()], updatedBy: room.lastEditor },
                { upsert: true }
            );
        }
        catch (err) {
            room.dirty = true;
        }
    });
    return room.saving;
}
function scheduleSave(meetingId, room) {
    room.dirty = true;
    if (room.timer) {
        return;
    }
    room.timer = setTimeout(() => {
        room.timer = null;
        saveRoom(meetingId);
    }, SAVE_EVERY_MS);
}
export function flushMeetingCanvas(meetingId) {
    return saveRoom(String(meetingId));
}
export async function importMeetingElements(io,meetingId,elements){
    const id=String(meetingId);
    const room=await loadroom(id);
    const added=[];
    for (const el of elements){
        if(el.isDeleted || room.elements.has(el.id)){
            continue;
        }
        if(room.elements.size>=MAX_ELEMENTS){
            break;
        }
        room.elements.set(el.id,el);
        added.push(el);
    }
    if(added.length){
        scheduleSave(id,room);
        io?.to(roomName(id)).emit('scene:update',{elements:added});
    }
    return added.length;
}
const validElement = (el) =>
    el && typeof el === 'object' &&
    typeof el.id === 'string' &&
    el.id.length <= 64 &&
    typeof el.type === 'string' &&
    Number.isFinite(el.version);

async function broadcastPresence(io, meetingId) {
    const sockets = await io.in(roomName(meetingId)).fetchSockets();
    const users = sockets.map((s) => ({
        socketId: s.id,
        userId: s.data.user.id,
        name: s.data.user.name,
        role: s.data.role
    }))
    io.to(roomName(meetingId)).emit('presence', users);
}
async function clearpresentation(io,meetingId){
    const id=String(meetingId);
    console.log('CLEAR CHECK', id, 'has:', presenting.has(id), [...presenting.keys()]);
    if(!presenting.has(id)){
        return;
    }
    const left=await io.in(roomName(id)).fetchSockets();
    console.log('LEFT ROLES', left.map((s) => s.data.role));
    if(left.some((s)=>s.data.role==='leader')){
        return;
    }
    presenting.delete(id);
    io.to(ideasRoom(id)).emit('idea:present',{ideaId:null})
}
async function afterLeave(io, meetingId) {
    await broadcastPresence(io, meetingId);
    const remaining = await io.in(roomName(meetingId)).fetchSockets();
    if (remaining.length === 0) {
        await saveRoom(meetingId);
        const again = await io.in(roomName(meetingId)).fetchSockets();
        const room = rooms.get(meetingId);
        if (again.length === 0 && room && !room.dirty) {
            rooms.delete(meetingId);
        }
    }
}

async function leaveMeeting(io, socket) {
    const { meetingId } = socket.data;
    if (!meetingId) {
        return;
    }
    socket.leave(roomName(meetingId));
    socket.data.meetingId = null;
    await afterLeave(io, meetingId);
}
export async function refreshMeetingRoles(io, meetingId,memberId=null) {
    if (!io) {
        return;
    }
    try {
        const sockets = await io.in(roomName(meetingId)).fetchSockets();
        for (const s of sockets) {
            if(!memberId && s.data.user.id!==String(memberId)){
                continue;
            }
            const membership = await Membership.findOne({
                project: s.data.projectId,
                user: s.data.user.id
            });
            if (!membership) {
                continue;
            }
            const role = await effectiverole(membership, meetingId);
            s.data.role = role;
            s.emit('meeting:role', { role });
        }
        await broadcastPresence(io, meetingId);
    }
    catch (err) {
        console.error('Could not refresh roles', err.message);
    }
}
export function initSockets(server) {
    const io = new Server(server, {
        cors: { origin: process.env.CLIENT_URL, credentials: true },
        maxHttpBufferSize: 2e6,
    })
    io.use(async (socket, next) => {
        console.log('socket auth: connection attempt')
        try {
            const cookies = readCookies(socket.handshake.headers.cookie || '');
            console.log('socket auth: cookies seen:', Object.keys(cookies));
            const probe = (COOKIE_NAMES.map((n) => cookies[n]).find(Boolean) || '');
            console.log('socket auth: token starts with:', JSON.stringify(probe.slice(0, 14)), 'length:', probe.length);
            const token = COOKIE_NAMES.map((name) => cookies[name]).find(Boolean);
            if (!token) {
                console.log('socket auth: no login cookie was sent ', Object.keys(cookies))
                return next(new Error('Not Authenticated'));
            }
            const payload = jwt.verify(token, process.env.JWT_SECRET)
            const id = payload.id ?? payload.userId ?? payload._id ?? payload.sub
            const user = await User.findById(id).select('name');
            if (!user) {
                console.log('socket auth:no user found in this token', payload)
                return next(new Error('Not Authenticated'));
            }
            socket.data.user = { id: String(user._id), name: user.name };
            next();
        }
        catch (err) {
            console.log('socket auth: token problem', err.message)
            next(new Error('Not Authenticated'));
        }
    })
    io.on('connection', (socket) => {
        socket.on('meeting:join', async (payload, ack) => {
            const reply = typeof ack === 'function' ? ack : () => { };
            try {
                const { projectId, meetingId } = payload || {};
                if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(meetingId)) {
                    return reply({ error: 'Meeting not found' });
                }
                const membership = await Membership.findOne({
                    project: projectId,
                    user: socket.data.user.id
                });
                const meeting = membership ? await Meeting.findOne({ _id: meetingId, project: projectId }) : null;
                if (!membership || !meeting) {
                    return reply({ error: 'Meeting not found' });
                }
                const role = await effectiverole(membership, meeting);
                const status = meetingStatus(meeting);
                if (status === 'ended') {
                    return reply({ error: 'meeting has ended', ended: true })
                }
                if (role !== 'leader') {
                    if (status === 'upcoming') {
                        return reply({ error: 'meeting has not started yet' });
                    }
                    const adm = await MeetingAdmission.findOne({ meeting: meetingId, user: socket.data.user.id });
                    if (adm?.state === 'denied') {
                        return reply({ error: 'You were removed from this meeting' });
                    }
                    if (adm?.state !== 'admitted') {
                        socket.data.waitingFor = meetingId;
                        socket.join(lobbyRoom(meetingId));
                        await broadcastLobby(io, meetingId);
                        return reply({ waiting: true });
                    }
                }
                socket.data.endsAt = (meeting.endedAt ?? new Date((meeting.startsAt ?? meeting.createdAt).getTime() + (meeting.duration ?? 60) * 60000)).getTime()

                const room = await loadroom(meetingId);
                if (socket.data.meetingId && socket.data.meetingId != meetingId) {
                    await leaveMeeting(io, socket);
                }
                socket.data.projectId = projectId;
                socket.data.meetingId = meetingId;
                socket.data.role = role;
                socket.join(roomName(meetingId));
                socket.data.waitingFor = null;
                if (role === 'leader') {
                    socket.join(leaderRoom(meetingId));
                    await broadcastLobby(io, meetingId);
                }

                reply({ ok: true, role, elements: [...room.elements.values()] });
                await broadcastPresence(io, meetingId);
            }
            catch (err) {
                console.error('meeting:join failed', err);
                reply({ error: 'Could not join the meeting' });
            }
        });
        socket.on('scene:update', async (payload) => {
            try {
                const { meetingId, role, user } = socket.data;
                if (!meetingId) {
                    return;
                }
                if (role !== 'leader' && role !== 'editor') {
                    socket.emit('meeting:error', { message: 'you can only view this canva' });
                    return;
                }
                if(Date.now()>socket.data.endsAt){
                    socket.emit('meeting:error',{message:'Meeting has ended'});
                    return;
                }
                const elements = payload?.elements;
                if (!Array.isArray(elements) || elements.length === 0 || elements.length > MAX_PER_UPDATE) {
                    return;
                }
                if (!elements.every(validElement)) {
                    return;
                }
                const room = await loadroom(meetingId);
                const accepted = [];
                for (const el of elements) {
                    const existing = room.elements.get(el.id);
                    if (!existing && room.elements.size > MAX_ELEMENTS) {
                        continue;
                    }
                    if (isNewer(el, existing)) {
                        room.elements.set(el.id, el);
                        accepted.push(el);
                    }
                }
                if (accepted.length === 0) {
                    return;
                }
                room.lastEditor = user.id;
                socket.to(roomName(meetingId)).emit('scene:update', { elements: accepted });
                scheduleSave(meetingId, room);
            }
            catch (err) {
                console.error('scne:update failed', err.message);
            }
        });
        socket.on('pointer:update', (payload) => {
            const { meetingId, user } = socket.data;
            const pointer = payload?.pointer;
            if (!meetingId || !pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) {
                return;
            }
            socket.to(roomName(meetingId)).volatile.emit('pointer:update', {
                socketId: socket.id,
                userName: user.name,
                pointer: { x: pointer.x, y: pointer.y, tool: pointer.tool === 'laser' ? 'laser' : 'pointer' },
                button: payload.button === 'down' ? 'down' : 'up'
            })
        });
        socket.on('lobby:decide',async({userId,allow}={},ack)=>{
            const reply=typeof ack==='function' ?ack:()=>{};
            const{meetingId,role}=socket.data;
            try{
            if(!meetingId || role!=='leader'||!mongoose.isValidObjectId(userId)){
                return reply({ error: 'Not allowed' });
            }
            if(allow){
            await MeetingAdmission.updateOne({meeting:meetingId,user:userId},{state:'admitted'},{upsert:true});
        }
        else{
            await MeetingAdmission.deleteOne({meeting:meetingId,user:userId})
        }
            const inLobby = await io.in(lobbyRoom(meetingId)).fetchSockets();
console.log('LOBBY SOCKETS', inLobby.map(s => s.data.user.id), 'deciding for', userId);
            for(const s of await io.in(lobbyRoom(meetingId)).fetchSockets()){
                if(s.data.user.id===userId){
                    s.leave(lobbyRoom(meetingId));
                    s.emit(allow?'meeting:admitted':'meeting:denied')
                }
            }
            await broadcastLobby(io,meetingId);
            reply({ok:true});
        }
        catch(err){
            console.error('lobby:decde failed',err);
            reply({error:'could not permit'});
        }
        })
        socket.on('meeting:kick',async ({userId}={},ack)=>{
            const reply=typeof ack==='function' ?ack:()=>{};
            try{
            const{meetingId,role,user}=socket.data;
            if(!meetingId || role!=='leader'||!mongoose.isValidObjectId(userId) || userId===user.id){
                return reply({ error: 'Not allowed' });
            }
            await MeetingAdmission.updateOne({meeting:meetingId,user:userId},{state:'denied'},{upsert:true});
            for(const s of await io.in(roomName(meetingId)).fetchSockets()){
                if(s.data.user.id===userId){
                    s.emit('meeting:kicked');
                    s.leave(roomName(meetingId));
                    s.leave(ideasRoom(meetingId));
                    s.data.meetingId=null;
                }
            }
            await broadcastPresence(io,meetingId);
            reply({ok:true});
        }
        catch(err){
            console.error('meting:kicked failed',err);
            reply({error:'could not kick'})
        }
        })
        socket.on('ideas:subscribe', async (payload, ack) => {
            const reply = typeof ack === 'function' ? ack : () => { };
            try {
                const { projectId, meetingId } = payload || {};
                if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(meetingId)) {
                    return reply();
                }
                const membership = await Membership.findOne({ project: projectId, user: socket.data.user.id });
                const meeting = membership ? await Meeting.findOne({ _id: meetingId, project: projectId }) : null;
                const role= membership && meeting ? await effectiverole(membership,meeting):null;
                let allowed=false;
                if (meeting && meetingStatus(meeting) === 'live') {
                    allowed=role==='leader'|| !!(await MeetingAdmission.exists({ meeting: meetingId, user: socket.data.user.id, state: 'admitted' }));
                }
                if(allowed){
                    socket.join(ideasRoom(meetingId));
                }
            }
            catch (err) {
                console.error('ideas subscribe failed', err.message);
            }
            reply();
        })
        socket.on('project:subscribe',async(payload,ack)=>{
            const reply = typeof ack === 'function' ? ack : () => { };
            try{
                const {projectId}=payload ||{};
                if(!mongoose.isValidObjectId(projectId)){
                    return reply();
                }
                const membership=await Membership.findOne({project:projectId, user:socket.data.user.id});
                if(membership){
                    socket.join(projectRoom(projectId));
                }
            }
            catch(err){
                console.error('project:subscribe failed',err.message)
            }
            reply();
        })
        socket.on('disconnect', () => {
            const { meetingId } = socket.data;
            if (meetingId) {
                afterLeave(io, meetingId).catch((err) => console.error(err.message));
                setTimeout(()=>clearpresentation(io,meetingId).catch(()=>{}),5000);
            }
        });
    });
    return io;
}