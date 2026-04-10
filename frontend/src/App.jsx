// import React from "react";
// import { Routes, Route,Navigate } from "react-router-dom";
// import SignUp from "./pages/SignUp.jsx";
// import Login from "./pages/Login.jsx";
// import useCurrentUser from "./customHooks/useCurrentUser.jsx";
// import { useSelector } from "react-redux";
// import Profile from "./pages/Profile.jsx";
// import Home  from "./pages/home.jsx";

// const App = () => { 
//   useCurrentUser();
//   let{userData}=useSelector(state=>state.user) 

//   return (
    
//     <Routes>
//         <Route path="/" element={ userData?<Home/>:<Navigate to="/login"/>} />
//       <Route path="/signup" element={ !userData?<SignUp/>:<Navigate to="/Profile"/>} />
//       <Route path="/login" element={ !userData?<Login/>:<Navigate to="/"/>} />
//        <Route path="/profile" element={ userData?<Profile/>:<Navigate to="/login"/>} />
//       <Route path="*" element={<div className="text-red-500 text-center mt-10">404 - Page Not Found</div>} />
//     </Routes>
//   );
// };

// export default App; 

// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// import SignUp from "./pages/SignUp.jsx";
// import Login from "./pages/Login.jsx";
// import useCurrentUser from "./customHooks/useCurrentUser.jsx";
// import { useSelector } from "react-redux";
// import Profile from "./pages/Profile.jsx";
// import Home from "./pages/home.jsx";

// const App = () => {
//   const loading = useCurrentUser(); // Loading state hook
//   const { userData } = useSelector((state) => state.user);

//   // Loading screen while fetching current user
//   if (loading) {
//     return (
//       <div className="text-center mt-10 text-xl font-semibold">
//         Loading...
//       </div>
//     );
//   }

//   return (
//     <Routes>
//       {/* Home route */}
//       <Route
//         path="/"
//         element={userData ? <Home /> : <Navigate to="/login" />}
//       />
//       {/* Optional lowercase home route */}
//       <Route
//         path="/home"
//         element={userData ? <Home /> : <Navigate to="/login" />}
//       />

//       {/* Auth routes */}
//       <Route
//         path="/signup"
//         element={!userData ? <SignUp /> : <Navigate to="/profile" />}
//       />
//       <Route
//         path="/login"
//         element={!userData ? <Login /> : <Navigate to="/" />}
//       />

//       {/* Profile */}
//       <Route
//         path="/profile"
//         element={userData ? <Profile /> : <Navigate to="/login" />}
//       />

//       {/* Catch all */}
//       <Route
//         path="*"
//         element={<div className="text-red-500 text-center mt-10">404 - Page Not Found</div>}
//       />
//     </Routes>
//   );
// };

// export default App;

import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Home from "./pages/Home"; // 'home' ko 'Home' kiya (Capital H)
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";

function App() {
  // Check kar rahe hain ki userData hai ya nahi
  // Hum !! ka use karke ise boolean (true/false) mein convert kar rahe hain
  // Aur ye bhi check kar rahe hain ki userData ke andar _id hai ya nahi
  const user = useSelector((state) => state.user.userData);
  const isAuthenticated = user && user._id; 

  return (
    <Routes>
      {/* 1. Home Route: Agar logged in hai toh Home, nahi toh Login */}
      <Route
        path="/"
        element={isAuthenticated ? <Home /> : <Navigate to="/login" replace />}
      />

      {/* 2. Login Route: Agar pehle se login hai toh Home bhej do */}
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
      />

      {/* 3. SignUp Route: Agar pehle se login hai toh seedha Home bhej do */}
      <Route
        path="/signup"
        element={!isAuthenticated ? <SignUp /> : <Navigate to="/" replace />}
      />

      {/* 4. Profile Route: Login zaroori hai */}
      <Route
        path="/profile"
        element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
      />

      {/* 5. Fallback: Agar koi galat URL daale toh login par bhej do */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;