// import genToken from "../config/token.js";
// import User from "../models/user.model.js";
// import bcrypt from"bcryptjs"


// export const signUp=async(req,res)=>{
//     try {
//         const{username,email,password}=req.body

//         const checkUserByUserName=await User.findOne({username})
//         if(checkUserByUserName){
//             return res.status(400).json({message:"username already exist"})
//         }
             
//         const checkUserByEmail=await User.findOne({email})
//         if(checkUserByEmail){
//             return res.status(400).json({message:"email already exist"})
//         }

//         if(password.length<6){
//            return res.status(400).json({message:"password must be atleast 6 character"})
//         }


//         const hashedPassword=await bcrypt.hash(password,10)

//         const user=await user.create({
//             username,email,password:hashedPassword
//         })
// //        return res.status(201).json({
// //     message: "User created successfully",
// //     user: {
// //         id: newUser._id,
// //         username: newUser.username,
// //         email: newUser.email
// //     }
// // })

// const token=genToken(user._id)

// res.cookie("token",token,{
//     httpOnly:true,
//     maxAge:7*24*60*60*1000,
//     samesite:"None",
//     secure:false
// })

// return res.status(201).json(user)


//     } catch (error) {
//         return res.status(500).json({message:`signup error $(error)`})
//     }

// }

// // LOGIN
// export const login=async(req,res)=>{
//     try {
//         const{email,password}=req.body
   
//         const User =await User.findOne({email})
//         if(!user){
//             return res.status(400).json({message:"user does not exist"})
//         }

//        const isMatch=await bcrypt.compare(password,user.password)
//        if(!isMatch){
//          return res.status(400).json({message:"incorrect password"})
//        }


       

// //        return res.status(201).json({
// //     message: "User created successfully",
// //     user: {
// //         id: newUser._id,
// //         username: newUser.username,
// //         email: newUser.email
// //     }
// // })

// const token=genToken(user._id)

// res.cookie("token",token,{
//     httpOnly:true,
//     maxAge:7*24*60*60*1000,
//     samesite:"None",
//     secure:false
// })

// return res.status(200).json(user)


//     } catch (error) {
//         return res.status(500).json({message:`login error $(error)`})
//     }

// }


// export const logOut=async(req,res)=>{
//     try {
//         res.clearCookie("token")
//         return res.status(200).json({message:"logout successfully "})
//     } catch (error) {
//         return res.status(500).json({message:`logout error $(error)`})
//     }
// }


import genToken from "../config/token.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

// SIGNUP
export const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const checkUserByUserName = await User.findOne({ username });
    if (checkUserByUserName) return res.status(400).json({ message: "Username already exists" });

    const checkUserByEmail = await User.findOne({ email });
    if (checkUserByEmail) return res.status(400).json({ message: "Email already exists" });

    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ username, email, password: hashedPassword });
    const token = genToken(newUser._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Strict",
      secure: false,
    });

    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ message: `Signup error: ${error.message}` });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    const token = genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Strict",
      secure: false,
    });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Login error: ${error.message}` });
  }
};

// LOGOUT
export const logOut = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logout successfully" });
  } catch (error) {
    return res.status(500).json({ message: `Logout error: ${error.message}` });
  }
};
