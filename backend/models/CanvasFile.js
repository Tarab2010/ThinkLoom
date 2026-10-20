import mongoose, { mongo } from "mongoose";
const CanvasFileSchema=new mongoose.Schema({
    meeting:{type:mongoose.Schema.Types.ObjectId,ref:'Meeting',required:true},
    fileId:{type:String,required:true},
    key:{type:String,required:true},
    mime:{type:String,required:true},
    size:{type:Number,required:true},
    user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}
},
{timestamps:true});
CanvasFileSchema.index({meeting:1,fileId:1},{unique:true});
export default mongoose.model('CanvasFile',CanvasFileSchema);