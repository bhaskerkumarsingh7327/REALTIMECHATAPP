// import { createSlice } from "@reduxjs/toolkit";

// const userSlice=createSlice({
//     name:"user",
//     initialState:{
//         userData:null
//     },
//     reducers:{
//         setUserData:(state,action)=>{
//             state.userData=action.payload;

//         }
//     }
// })
// export const {setUserData}=userSlice.actions;
// export default userSlice.reducer; 

import { createSlice } from "@reduxjs/toolkit";

const storedUser = JSON.parse(localStorage.getItem("userData"));

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: storedUser || null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      localStorage.setItem("userData", JSON.stringify(action.payload));
    },
    clearUserData: (state) => {
      state.userData = null;
      localStorage.removeItem("userData");
    },
  },
});

export const { setUserData, clearUserData } = userSlice.actions;
export default userSlice.reducer;
