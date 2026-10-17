import mongoose from "mongoose";
import Meetingroles from "../models/Meetingroles.js";
import Membership from "../models/Membership.js";
import Meetings from "../models/Meetings.js";

export async function effectiverole(membership,meetingId){
    if(membership.role==='leader'){
        return 'leader';
    }
    const override=await Meetingroles.findOne({meeting:meetingId,user:membership.user});
    return override?override.role:membership.role;
}
export function requiremeetingrole(...allowed){
    return async(req,res,next)=>{
        const{projectId,meetingId}=req.params;
        if(!mongoose.isValidObjectId(projectId)){
            return res.status(404).json({error:'Project not found'});
        }
        if(!mongoose.isValidObjectId(meetingId)){
            return res.status(404).json({error:'Meeting not found'});
        }
        const membership=await Membership.findOne({project:projectId,user:req.userId});
        if(!membership){
            return res.status(404).json({error:'meeting not found'});
        }
        const meeting=await Meetings.findOne({_id:meetingId,project:projectId});
        if(!meeting){
            return res.status(404).json({error:'meeting not found'});
        }
        const role=await effectiverole(membership,meetingId);
        if(!role ||(allowed.length && !allowed.includes(role))){
            return res.status(403).json({error:`you do  not  have permission to do this`});
        }
        req.membership=membership;
        req.meetingrole=role;
        req.meeting=meeting;
        next();
    };
}