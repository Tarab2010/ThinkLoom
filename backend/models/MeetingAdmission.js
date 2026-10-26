import mongoose from "mongoose";
const S=new mongoose.Schema({
    meeting:{type:mongoose.Schema.Types.ObjectId,ref:'Meeting' ,required:true},
    user:{type:mongoose.Schema.Types.ObjectId,ref:'User' ,required:true},
    state:{type:String, enum:['admitted','denied','blocked'], required:true},
    denyCount:{type:Number,default:0}
},{timestamps:true});
S.index({meeting:1,user:1},{unique:true});
export default mongoose.model('MeetingAdmission',S);