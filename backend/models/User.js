import mongoose from 'mongoose';
import validator from 'validator'
const userschema=new mongoose.Schema(
    {
        name:{type:String, required:true, trim:true},
        email:{type:String, required:true, trim: true, unique:true, lowercase:true,validate:{validator:(value)=>validator.isEmail(value),message:"please enter a valid email address"}},
        passwordHash:{type:String, required:true}
    },
    {timestamps:true}
)
export default mongoose.model('User', userschema);