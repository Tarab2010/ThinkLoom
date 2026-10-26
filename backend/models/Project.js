import mongoose from 'mongoose';
import {randomBytes} from 'crypto';
const projectschema=new mongoose.Schema(
    {
        name:{type:String, required:true, trim:true, maxlength:100},
        description:{type:String, required:true, maxlength:400, deafult:''},
        category:{type:String, default:'other', enum:['research', 'project','hackathon','other']},
        owner:{type:mongoose.Schema.Types.ObjectId, ref:'User',required:true},
        invitecode:{type:String, unique:true, default:()=>randomBytes(8).toString('hex')},
    },
    {timestamps:true}
);
export default mongoose.model('project',projectschema);