import express from "express";
import { getCurrentUser, updateProfile, getAllUsers } from "../controller/user.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.put("/profile", isAuth, updateProfile);
userRouter.get("/all", isAuth, getAllUsers);

export default userRouter;
