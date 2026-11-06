import express from "express";
import {
  getCurrentUser,
  updateProfile,
  getAllUsers,
  toggleBlockUser,
} from "../controller/user.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.put("/profile", isAuth, updateProfile);
userRouter.get("/all", isAuth, getAllUsers);
userRouter.post("/block", isAuth, toggleBlockUser);

export default userRouter;
