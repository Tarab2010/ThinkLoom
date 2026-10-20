import {Router} from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Membership from '../models/Membership.js';
import requireRole from '../middleware/projectrole.js';
import requireauth from '../middleware/auth.js';
const router=Router();
router.use(requireauth);
const summary=(project,role)=>({
    id:project._id,
    name: project.name,
    role,
    description:project.description,
    category:project.category,
});

router.post('/',async(req,res)=>{
    const name=String(req.body.name||'').trim();
    if(!name){
        return res.status(400).json({error:'Project name is required'});
    }
    const project =await Project.create({
        name,
        description:String(req.body.description||''),
        category:req.body.category,
        owner:req.userId,
    });
    await Membership.create({project:project._id,user:req.userId, role:'leader'});
    res.status(201).json(summary(project,'leader'));
})

router.get('/',async(req,res)=>{
    const memberships= await Membership.find({user:req.userId}).populate('project').sort({createdAt:-1});
    res.json(memberships.filter((m)=>m.project).map((m)=>summary(m.project,m.role)));
});

router.post('/join',async(req,res)=>{
    const project=await Project.findOne({invitecode:req.body.invitecode || ''});
    if(!project){
        return res.status(404).json({error:'Invalid invite link'});
    }
    await Membership.updateOne(
        {project:project._id,user:req.userId,},
        {$setOnInsert:{role:'viewer'}},
        {upsert:true}
    );
    res.json({id:project._id});
})

router.get('/:projectId',requireRole(),async(req,res)=>{
    const project =await Project.findById(req.params.projectId);
    if(!project){
        return res.status(404).json({error:'Project not found'});
    }
    const body=summary(project,req.membership.role);
    if(req.membership.role==='leader'){
        body.invitecode=project.invitecode;
    }
    res.json(body);
})

router.get('/:projectId/members',requireRole(), async(req,res)=>{
    const isLeader=req.membership.role==='leader';
    const list=await Membership.find({project:req.params.projectId}).populate('user','name email').sort({createdAt:1});
    res.json(list.filter((m)=>m.user).map((m)=>({userId:m.user._id,name:m.user.name,role:m.role,...(isLeader && {email:m.user.email}),})))
})

router.patch('/:projectId/members/:userId', requireRole('leader'), async(req,res)=>{
    const {role}=req.body;
    if(!['editor','viewer'].includes(role)){
        return res.status(400).json({error:'role must be editor or viewer'});
    }
    if(!mongoose.isValidObjectId(req.params.userId)){
        return res.status(404).json({error:'Member Not Found'});
    }
    const member=await Membership.findOneAndUpdate(
        {project:req.params.projectId, user:req.params.userId, role:{$ne:'leader'}},
        {role},
        {new:true}
    );
    if(!member){
        return res.status(404).json({error:'Member not found'})
    }
    res.json({userId:req.params.userId,role});
});
export default router;