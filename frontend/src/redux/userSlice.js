import { createSlice } from "@reduxjs/toolkit";

let storedUser = null;
try {
  const local = localStorage.getItem("userData");
  if (local && local !== "undefined") {
    storedUser = JSON.parse(local);
  }
} catch (e) {
  storedUser = null;
}

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: storedUser,
    token: localStorage.getItem("token") || null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      try {
        localStorage.setItem("userData", JSON.stringify(action.payload));
      } catch (e) {}
    },
    setToken: (state, action) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem("token", action.payload);
      } else {
        localStorage.removeItem("token");
      }
    },
    clearUserData: (state) => {
      state.userData = null;
      state.token = null;
      localStorage.removeItem("userData");
      localStorage.removeItem("token");
    },
  },
});

export const { setUserData, setToken, clearUserData } = userSlice.actions;
export default userSlice.reducer;
