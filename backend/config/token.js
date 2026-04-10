// import jwt from "jsonwebtoken"
// const genToken=async(userid)=>{
//     try {
//       const token=await jwt.sign((userid),process.env.JWT_SECRET,{expiresIn:"7d"})
//       return token
//     } catch (error) {
//         console.log("gen token expire")
//     }
// }
// export default genToken;

import jwt from "jsonwebtoken";

const genToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export default genToken;
