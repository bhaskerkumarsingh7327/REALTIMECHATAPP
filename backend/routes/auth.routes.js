// import express from "express";import { login, logOut, signUp } from "../controller/auth.controllers.js";
// ;

// const authRouter=express.Router()

// authRouter.post("/signUp",signUp)
// authRouter.post("/login",login)
// authRouter.get("/logOut",logOut)
    


// export default authRouter;

import express from "express";
import { login, logOut, signUp } from "../controller/auth.controllers.js";

const authRouter = express.Router();
authRouter.post("/signup", signUp);
authRouter.post("/login", login);
authRouter.get("/logout", logOut);

export default authRouter;
