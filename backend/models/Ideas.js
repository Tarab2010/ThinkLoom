import mongoose from 'mongoose';
const ref=(model)=>(
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:model,
        required:true,
        immutbale:true,
    }
)
const attachmentschema=new mongoose.Schema({
    key:{type:String,required:true},
    name:{type:String,required:true},
    mime:{type:String,required:true},
    kind:{type:String,required:true,enum:['image','pdf','docx']},
    size:{type:Number,required:true}
},
{_id:false})
const IdeaSchema=new mongoose.Schema({
    project:ref('User'),
    meeting:ref('Meeting'),
    author:ref('User'),
    title:{type:String, required:true, trim:true, maxlength:120,immutable:true},
    description:{type:String,maxlength:200,immutable:true,trim:true, default:''},
    attachment:{type:attachmentschema, defauly:null, immutable:true}
},
{timestamps:true});
IdeaSchema.index({meeting:1,createdAt:1});

export default mongoose.model('Idea',IdeaSchema);