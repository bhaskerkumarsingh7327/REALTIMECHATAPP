import { createSlice } from "@reduxjs/toolkit";

let storedUser = null;
try {
  const local = typeof localStorage !== "undefined" ? localStorage.getItem("userData") : null;
  if (local && local !== "undefined") {
    storedUser = JSON.parse(local);
  }
} catch (e) {
  storedUser = null;
}

let storedToken = null;
try {
  storedToken = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
} catch (e) {
  storedToken = null;
}

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: storedUser,
    token: storedToken,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      try {
        if (action.payload) {
          localStorage.setItem("userData", JSON.stringify(action.payload));
        } else {
          localStorage.removeItem("userData");
        }
      } catch (e) {}
    },
    setToken: (state, action) => {
      state.token = action.payload;
      try {
        if (action.payload) {
          localStorage.setItem("token", action.payload);
        } else {
          localStorage.removeItem("token");
        }
      } catch (e) {}
    },
    clearUserData: (state) => {
      state.userData = null;
      state.token = null;
      try {
        localStorage.removeItem("userData");
        localStorage.removeItem("token");
      } catch (e) {}
    },
  },
});

export const { setUserData, setToken, clearUserData } = userSlice.actions;
export default userSlice.reducer;
