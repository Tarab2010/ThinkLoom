import mongoose from 'mongoose';
import Membership from '../models/Membership.js';

export default function requireRole(...allowed){
    return async (req,res,next)=>{
        const {projectId}=req.params;
        if(!mongoose.isValidObjectId(projectId)){
            return res.status(404).json({error:'Project not found'});
        }
        const membership=await Membership.findOne({project:projectId, user:req.userId});
        if(!membership){
            return res.status(404).json({error:'Project not found'});
        }
        if(allowed.length && !allowed.includes(membership.role)){
            return res.status(403).json({error:'You do not have permission to do that'});
        }
        req.membership=membership;
        next();
    }
}