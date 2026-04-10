// import { useEffect } from "react"
// import { serverUrl } from "../main"
// import { setUserData } from "../redux/userSlice"

// const getCurrentUser=()=>{
// useEffect(()=>{
//     const fetchUser=async ()=>{     
//         try {
//             let result=await axios.get(`${serverUrl}/api/user/current` ,{withCredentials:true}   )
//                 dispatch(setUserData(result.data))
//                } catch (error) {
//                 console.log(error)
            
//         }
//         }
//         fetchUser()
//     },[userData])
// }
// export default getCurrentUser; 

// import { useEffect, useState } from "react";
// import { serverUrl } from "../main";
// import { setUserData } from "../redux/userSlice";
// import { useDispatch } from "react-redux";
// import axios from "axios";

// const useCurrentUser = () => {
//   const dispatch = useDispatch();
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const result = await axios.get(`${serverUrl}/api/user/current`, {
//           withCredentials: true,
//         });
//         dispatch(setUserData(result.data));
//       } catch (error) {
//         console.log("Error fetching current user:", error);
//         dispatch(setUserData(null)); // ensure redux has null
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [dispatch]);

//   return loading; // return loading state for App.jsx
// };

// export default useCurrentUser;



import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import axios from "axios";
import { serverUrl } from "../main";

const useCurrentUser = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const localUser = localStorage.getItem("userData");
        if (localUser) {
          dispatch(setUserData(JSON.parse(localUser)));
          setLoading(false);
          return;
        }

        const res = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });

        if (res.data.user) {
          dispatch(setUserData(res.data.user));
          localStorage.setItem("userData", JSON.stringify(res.data.user));
        }
      } catch (error) {
        console.log("Error fetching current user:", error);
        localStorage.removeItem("userData");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  return loading;
};

export default useCurrentUser;
