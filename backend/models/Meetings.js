import mongoose from 'mongoose';

const meetingschema =new mongoose.Schema(
    {
        project:{type:mongoose.Schema.Types.ObjectId, ref:'Project',required:true,index:true},
        title:{type:String, required:true, trim:true, maxlength:120},
        topic:{type:String, required:true, trim:true},
        startsAt:{type:Date,required:true},
        endedAt:{type:Date},
        duration:{type:Number, required:true, min:5, max:480,default:60},
        createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User', required:true},
        startedFrom:{type:mongoose.Schema.Types.ObjectId,ref:'Meeting',default:null}
    },
    {timestamps:true}
);
export default mongoose.model('Meeting',meetingschema);