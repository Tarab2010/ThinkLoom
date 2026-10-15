import mongoose from 'mongoose';
const membershipschema =new mongoose.Schema(
    {
        project:{type:mongoose.Schema.Types.ObjectId, ref:'project', required:true},
        user:{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
        role:{type:String, enum:['leader','editor','viewer'],default:'viewer'},
    },
    {timestamps:true}
);
membershipschema.index({project:1,user:1},{unique:true});
export default mongoose.model('Membership', membershipschema);