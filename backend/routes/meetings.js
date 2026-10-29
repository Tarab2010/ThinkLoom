import {Router} from 'express';
import mongoose, { overwriteMiddlewareResult } from 'mongoose';
import { requiremeetingrole } from '../middleware/meetingrole.js';
import requireRole from '../middleware/projectrole.js';
import requireauth from '../middleware/auth.js';
import Meetings from '../models/Meetings.js';
import Membership from '../models/Membership.js';
import CanvasFile from '../models/CanvasFile.js';
import { projectRoom } from '../sockets/meetingSocket.js';
import { meetingStatus } from '../lib/meetingStatus.js';
import Meetingrole from '../models/Meetingroles.js';
import CanvasVersion from '../models/CanvasVersion.js';
import { flushMeetingCanvas,importMeetingElements,refreshMeetingRoles } from '../sockets/meetingSocket.js';
const router=Router({mergeParams:true});
router.use(requireauth);

function meetingjson(m,myRole){
    const startsAt=m.startsAt??m.createdAt;
    const duration=m.duration??60;
    const now=Date.now();
    const status=meetingStatus(m);
    const endsAt=m.endedAt??new Date(startsAt.getTime()+duration*60000);
    return {id:m._id,myRole,startsAt,endsAt,duration,status,title:m.title,topic:m.topic,projectId:m.project,startedFrom:m.startedFrom,createdAt:m.createdAt};
}
function readmeetingfields (body){
    const title=String(body.title||'').trim();
    if(!title){
        return{error:'title is not present'};
    }
    const topic=String(body.topic||'').trim();
    if(!topic){
        return{error:'topic is required in a meeting'};
    }
    const startsAt=new Date(body.startsAt);
    if(!body.startsAt || Number.isNaN(startsAt.getTime())){
        return {error:'A valid start date and time is required'};
    }
    const duration=body.duration===undefined || body.duration===''?60:Number(body.duration);
    if(!Number.isInteger(duration) || duration<5 || duration>480){
        return {error:'duration must be an integer'};
    }
    return {fields:{title,topic,startsAt,duration}};
}
router.post('/',requireRole('leader'),async(req,res)=>{
    const {error,fields}=readmeetingfields(req.body);
    if(error){
        return res.status(400).json({error});
    }
    let startedFrom=null;
    if(req.body.startedFrom){
        if(!mongoose.isValidObjectId(req.body.startedFrom)){
            return res.status(400).json({error:'Invalid previous meeting'})
        }
        const prev=await Meetings.findOne({_id:req.body.startedFrom,project:req.params.projectId});
        if(!prev){
            return res.status(400).json({error:'Previous meeting not found for this project'});
        }
        startedFrom=prev._id;
    }
    const meeting=await Meetings.create({
        ...fields,createdBy:req.userId,project:req.params.projectId,startedFrom
    });
    let startingElements=[];
    if(startedFrom){
        const files=await CanvasFile.find({meeting:startedFrom});
        if(files.length){
            await CanvasFile.insertMany(files.map((f)=>({
                meeting:meeting._id,fileId:f.fileId,key:f.key,mime:f.mime,size:f.size,user:f.user
            })));
        }
    }
    await CanvasVersion.create({
        meeting:meeting._id,
        elements:startingElements,
        updatedBy:req.userId
    })
    req.app.get('io').to(projectRoom(req.params.projectId)).emit('meetings:changed');
    res.status(201).json(meetingjson(meeting,'leader'));
})
router.get('/',requireRole(),async(req,res)=>{
    const meeting=await Meetings.find({project:req.params.projectId}).sort({
        startsAt:-1,
        createdAt:-1
    });
    const overrides=await Meetingrole.find({
        user:req.userId,
        meeting:{$in:meeting.map((m)=>m._id)}
    })
    const byMeeting=new Map(overrides.map((o)=>[String(o.meeting),o.role]));
    const isLeader=req.membership.role==='leader';
    res.json(
        meeting.map((m)=>
            meetingjson(m,isLeader?'leader':(byMeeting.get(String(m._id))??req.membership.role))
        )
    )
});
router.get('/:meetingId',requiremeetingrole(),(req,res)=>{
    res.json(meetingjson(req.meeting,req.meetingrole));
})

router.get('/:meetingId/members',requiremeetingrole(),async(req,res)=>{
    const isLeader=req.meetingrole==='leader';
    const memberships=await Membership.find({project:req.params.projectId}).populate('user','name email').sort({createdAt:-1});
    const overrides= await Meetingrole.find({meeting:req.meeting._id});
    const byUser=new Map(overrides.map((o)=>[String(o.user),o.role]));
    res.json(
    memberships
        .filter((m) => m.user)
        .map((m) => ({
            userId: m.user._id,
            name: m.user.name,
            role: m.role === 'leader'
                ? 'leader'
                : (byUser.get(String(m.user._id)) ?? m.role),
            ...(isLeader && { email: m.user.email }),
        }))
);
});
router.post('/:meetingId/end',requiremeetingrole('leader'),async(req,res)=>{
    await flushMeetingCanvas(req.meeting._id);
    req.meeting.endedAt=new Date();
    await req.meeting.save();
    const io=req.app.get('io');
    const id=String(req.meeting._id);
    io?.to(`meeting:${id}`).emit('meeting:ended');
    io?.to(`lobby:${id}`).emit('meeting:ended');
    io?.to(projectRoom(String(req.meeting.project))).emit('meeting:changed');
    for(const s of (await io?.in(`meeting:${id}`).fetchSockets())??[]){
        s.leave(`meeting:${id}`);
        s.leave(`ideas:${id}`);
        s.data.meetingId=null;
    }

    res.json({ok:true});
})
router.get(`/:meetingId/canvas`,requiremeetingrole(),async(req,res)=>{
    await flushMeetingCanvas(req.meeting._id);
    const cv=await CanvasVersion.findOne({meeting:req.meeting._id});
    res.json({elements:cv?cv.toObject().elements:[]});
})
router.post('/:meetingId/import-canvas',requiremeetingrole('leader'),async(req,res)=>{
    const {fromMeetingId}=req.body;
    if(!mongoose.isValidObjectId(fromMeetingId) || String(fromMeetingId)===String(req.meeting._id)){
        return res.status(400).json({error:'Pick a different meeting'});
    }
    if(meetingStatus(req.meeting)==='ended'){
        return res.status(403).json({error:'This meeting has ended'});
    }
    const source=await Meetings.findOne({_id:fromMeetingId,project: req.params.projectId});
    if(!source){
        return res.status(404).json({error:'Previous meeting not found'});
    }
    await flushMeetingCanvas(source._id);
    const cv=await CanvasVersion.findOne({meeting:source._id});
    const elements=cv?cv.toObject().elements:[];
    const files=await CanvasFile.find({meeting:source._id});
    if(files.length){
        await CanvasFile.insertMany(
            files.map((f)=>({meeting:req.meeting._id,fileId:f.fileId,key:f.key,mime:f.mime,size:f.size,user:f.user})),
            {ordered:false}
        ).catch((err)=>{if (err.code!==11000 && !err.writeErrors) throw err;});
    }
    const added=await importMeetingElements(req.app.get('io'),req.meeting._id,elements);
    res.json({ok:true,added});
})
router.patch('/:meetingId/members/:userId',requiremeetingrole('leader'),async(req,res)=>{
    const {role}=req.body;
    if(!['editor','viewer'].includes(role)){
        return res.status(400).json({error:'role must be editor of viewer'});
    }
    if(!mongoose.isValidObjectId(req.params.userId)){
        return res.status(400).json({error:'Member not found'});
    }
    const target=await Membership.findOne({project:req.params.projectId,user:req.params.userId});
    if(!target){
        return res.status(404).json({error:'member not found'});
    }
    await Meetingrole.updateOne({meeting:req.meeting._id,user:req.params.userId},
        {role},
        {upsert:true}
    );
    await refreshMeetingRoles(req.app.get('io'),String(req.meeting._id),req.params.userId);
    res.json({userId:req.params.userId,role});
})
export default router;