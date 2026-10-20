import mongoose from "mongoose";
const Voteschema= new mongoose.Schema({
    idea:{type:mongoose.Schema.Types.ObjectId,ref:'Idea',required:true},
    user:{type:mongoose.Schema.Types.ObjectId, ref:'User',required:true}
},
{timestamps:false});
Voteschema.index({idea:1,user:1},{unique:true});
export default mongoose.model('Vote',Voteschema);