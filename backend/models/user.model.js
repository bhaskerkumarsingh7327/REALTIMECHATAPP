// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//     name:{
//         type:String
    
//     },
//     username:{
//         type:String,
//         required:true,
//         unique:true,
//     },
//        email:{
//         type:String,
//         required:true,
//         unique:true,
//     },
//        password:{
//         type:String,
//         required:true,
     
//     },
//     image:{
//         type:String,
//         default:""

//     }
// },{timestamps:true})


// const user=mongoose.model("user" ,userSchema);

// export default user;

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
