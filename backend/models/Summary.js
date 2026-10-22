import mongoose from 'mongoose';
const summary=new mongoose.Schema({
    meeting:{type:mongoose.Schema.Types.ObjectId, ref:'Meeting',required:true},
    project:{type:mongoose.Schema.Types.ObjectId, ref:'Project',required:true},
    text:{type:String,required:true},
    source:{type:String, enum:['ai','template'],required:true},
    createdby:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});
summary.index({meeting:1,createdAt:1});
export default mongoose.model('Summary',summary);