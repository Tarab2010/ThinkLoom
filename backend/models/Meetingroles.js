import mongoose from "mongoose";

const meetingroleschema=new mongoose.Schema(
    {
        meeting:{type:mongoose.Schema.Types.ObjectId, ref:'Meeting',required:true},
        user:{type:mongoose.Schema.Types.ObjectId, ref:'User',required:true},
        role:{type:String, enum:['editor','viewer'],required:true},
    },
    {timestamps:true}
);
meetingroleschema.index({meeting:1,user:1},{unique:true});
export default mongoose.model('Meetingrole',meetingroleschema);