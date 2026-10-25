import {Router} from 'express';
import {ideasRoom} from '../sockets/meetingSocket.js';
import Idea from '../models/Ideas.js';
import mongoose from 'mongoose';
import multer from 'multer';
import Vote from '../models/Votes.js';
import { presenting } from '../lib/presenting.js';
import requireauth from '../middleware/auth.js';
import {requiremeetingrole} from '../middleware/meetingrole.js';
import { detectType,ALLOWED_TEXT } from '../lib/fileTypes.js';
import { saveFile,pathFor,removeFile } from '../lib/storage.js';
import { meetingStatus } from '../lib/meetingStatus.js';
const router=Router({mergeParams:true});
router.use(requireauth);
const member=requiremeetingrole();
const MAX_IDEAS_PER_USER=30;
const MAX_FILE_MB=10;
const upload=multer({
    storage:multer.memoryStorage(),
    limits:{fileSize:MAX_FILE_MB*1024*1024,files:1,fields:5}
}).single('file');
function acceptUpload(req,res,next){
    upload(req,res,(err)=>{
        if(!err){
            return next();
        }
        const toobig=err.code==='LIMIT_FILE_SIZE';
        res.status(400).json({error:toobig?'file is too large':'could not read the uploaded file'});
    })
}
const cleanName = (name, ext) => {
  const base = String(name || '')
    .replace(/\.[^.]*$/, '')
    .replace(/[^\w .()-]+/g, '_')
    .trim()
    .slice(0, 80);
  return `${base || 'file'}.${ext}`;
};
const baseIdea=(idea)=>({
    id:idea._id,
    title:idea.title,
    authorId:String(idea.author?._id??idea.author),
    authorName:idea.author?.name??'unknown',
    description:idea.description,
    createdAt:idea.createdAt,
    attachment:idea.attachment?{
        name:idea.attachment.name,
        mime:idea.attachment.mime,
        kind:idea.attachment.kind,
        size:idea.attachment.size,
    }:null,
})
const ideaJson=(idea,votes,myVote)=>({...baseIdea(idea),votes,myVote})

const live=(req)=>req.app.get('io')?.to(ideasRoom(req.meeting._id));
async function findIdea(req){
    if(!mongoose.isValidObjectId(req.params.ideaId)){
        return null;
    }
    return Idea.findOne({_id:req.params.ideaId, meeting:req.meeting._id});
}
router.get('/',member,async(req,res)=>{
    const idea=await Idea.find({meeting:req.meeting._id}).sort({createdAt:1}).populate('author','name');
    const ids=idea.map((i)=>i._id);
    const [counts,mine]=await Promise.all([
        Vote.aggregate([{$match:{idea:{$in:ids}}},{$group:{_id:'$idea',n:{$sum:1}}}]),
        Vote.find({user:req.userId,idea:{ $in: ids } }).select('idea'),
    ]);
    const totals=new Map(counts.map((c)=>[String(c._id),c.n]));
    const mineSet=new Set(mine.map((v)=>String(v.idea)));
    res.json(idea.map((i)=>ideaJson(i,totals.get(String(i._id))??0,mineSet.has(String(i._id)))))
});
router.post('/',member, acceptUpload,async(req,res)=>{
    if(meetingStatus(req.meeting)!=='live'){
        return res.status(403).json({error:'meeting is not live'});
    }
    let title=String(req.body.title||'').trim();
    const description=String(req.body.description||'').trim();
    if(!req.file){
        return res.status(400).json({error:'file is not present'});
    }
    if(title.length>120){
        return res.status(400).json({error:'title can be atmost 120 characters'});
    }
    if(description.length>2000){
        return res.status(400).json({error:'description should not exceed 2000 characters'});
    }
    const already=await Idea.countDocuments({meeting:req.meeting._id,author:req.userId});
    if(already>=MAX_IDEAS_PER_USER){
        return res.status(400).json({error:`you can submit atmost ${MAX_IDEAS_PER_USER} ideas`})
    }
    const type=detectType(req.file.buffer)
    if(!type){
        return res.status(400).json({error:`This file type is not allowed`})
    }
    const attachment={
        key:await saveFile(req.file.buffer,type.ext),
        name:cleanName(req.file.originalname,type.ext),
        mime:type.mime,
        kind:type.kind,
        size:req.file.size,
    }
    if(!title){
        title=attachment.name;
    }
    let idea;
    try{
        idea=await Idea.create({project:req.meeting.project,meeting:req.meeting._id,author:req.userId,title,description,attachment});    
        await idea.populate('author','name');
    }
    catch(err){
        await removeFile(attachment.key);
        throw err;
    }
    live(req)?.emit('idea:new',{...baseIdea(idea),votes:0});
    res.status(201).json(ideaJson(idea,0,false));
})
router.get('/:ideaId/file',member,async(req,res)=>{
    const idea=await findIdea(req);
    if(!idea?.attachment){
        return res.status(404).json({error:'File not found'});
    }
    const {key,name,mime,kind}=idea.attachment;
    const inline=!req.query.download && (kind==='image' || kind==='pdf');
    res.sendFile(
        pathFor(key),{
            dotfiles:'deny',
            headers:{
                'Content-Type':mime,
                'X-Content-Type-Options':'nosniff',
                'Content-Disposition':`${inline?'inline':'attachment'};filename="${name}"`,
                'Cache-Control': 'private, max-age=300',
            },
        },
        (err)=>{
            if(err && !res.headersSent){
                res.status(404).json({error:'File not found'});
            }
        }
    )
})
router.put('/:ideaId/vote',member,async(req,res)=>{
    if(meetingStatus(req.meeting)!=='live'){
        return res.status(403).json({error:'meeting is not live'});
    }
    const idea=await findIdea(req);
    if(!idea){
        return res.status(404).json({error:'idea not found'});
    }
    try{
        await Vote.create({idea:idea._id,user:req.userId});
    }
    catch(err){
        if(err.code!==11000){
            throw err;
        }
    }
    const votes= await Vote.countDocuments({idea:idea._id});
    live(req)?.emit('idea:votes',{ideaId:String(idea._id),votes});
    res.json({votes,myVote:true});
});
router.get('/present',member,async (req,res)=>{
    const id=String(req.meeting._id);
    const io=req.app.get('io');
    const here=(await io?.in(`meeting:${id}`).fetchSockets())??[];
    const leaderhere=here.some((s)=>s.data.role==='leader');

    res.json({ideaId:leaderhere?presenting.get(String(req.meeting._id))??null:null})
})
router.post('/present',requiremeetingrole('leader'),async(req,res)=>{
    if(meetingStatus(req.meeting)!=='live'){
        return res.status(403).json({error:'meeting is not live now'});
    }
    const key=String(req.meeting._id);
    let ideaId=req.body.ideaId||null;
    if(ideaId){
        const idea=mongoose.isValidObjectId(ideaId)?await Idea.findOne({_id:ideaId,meeting:req.meeting._id}):null;
        if(!idea){
            return res.status(404).json({error:'idea not found'});
        }
        ideaId=String(idea._id);
        presenting.set(key,ideaId);
    }
    else{
        presenting.delete(key);
    }
    live(req)?.emit('idea:present',{ideaId});
    res.json({ideaId});
})
router.delete('/:ideaId/vote',member,async(req,res)=>{
    if(meetingStatus(req.meeting)!=='live'){
        return res.status(403).json({error:'meeting is not live'});
    }
    const idea=await findIdea(req);
    if(!idea){
        return res.status(404).json({error:'idea not found'});
    }
    await Vote.deleteOne({idea:idea._id,user:req.userId});
    const votes=await Vote.countDocuments({idea:idea._id});
    live(req)?.emit('idea:votes',{ideaId:String(idea._id),votes});
    res.json({votes,myVote:false});
})
export default router;