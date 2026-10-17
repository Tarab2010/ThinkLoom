import mongoose from 'mongoose';

const canvasschema=new mongoose.Schema(
    {
        meeting:{type:mongoose.Schema.Types.ObjectId, ref:'Meeting',required:true,unique:true},
        element:{type:[mongoose.Schema.Types.Mixed],default:[]},
        edittedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
    },
    {timestamps:true}
);
export default mongoose.model('CanvasVersion',canvasschema);
