// import React, { useState } from "react";

// function Login() {
// const [showPassword, setShowPassword] = useState(false);

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
//       <div className="w-full max-w-md bg-[#20c7ff] rounded-xl shadow-lg overflow-hidden">

//         {/* header */}
//         <div className="bg-gradient-to-r from-blue-400 via-blue-400 to-indigo-400 h-36 flex flex-col items-center justify-center text-white rounded-b-[30%]">
//           <h2 className="text-3xl font-bold text-black">
//             Welcome to <span className="text-white"> B Chat</span>
//           </h2>
//           <p className="text-sm mt-1">Join us and start chatting!</p>
//         </div>

//         {/* form section */}
//         <div className="p-6 space-y-5">
//           <form className="space-y-4">
//             <div>
//               <label className="block text-gray-700 font-medium mb-1" htmlFor="username">
//                 Username
//               </label>
//               <input
//                 id="username"
//                 type="text"
//                 placeholder="Enter username"
//                 className="w-full px-4 py-2 border-2 bg-gray-200 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200"
//               />
//             </div>

//             <div>
//               <label className="block text-gray-700 font-medium mb-1" htmlFor="email">
//                 Email
//               </label>
//               <input
//                 id="email"
//                 type="email"
//                 placeholder="Enter email"
//                 className="w-full px-4 py-2 border-2 bg-gray-200 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200"
//               />
//             </div>

//             <div>
//               <label className="block text-gray-700 font-medium mb-1" htmlFor="password">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter password"
//                   className="w-full px-4 py-2 border-2 bg-gray-200 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200 pr-10"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute inset-y-0 right-2 px-2 flex items-center text-sm text-gray-600 hover:text-black focus:outline-none"
//                 >
//                   {showPassword ? "Hide" : "Show"}
//                 </button>
//               </div>
//             </div>

//             <div className="flex justify-center">
//               <button
//                 type="submit"
//                 className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-600 transition duration-300"
//               >
//                 Sign Up
//               </button>
//             </div>
//           </form>

//           <p className="text-center text-sm text-gray-600">
//             Already have an account?{' '}
//             <a href="/login" className="text-indigo-600 hover:underline">
//               Login
//             </a>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Login;


// import React, { useState } from "react"; 
// import axios from "axios";
// import { serverUrl } from "../main";
// import { useDispatch } from "react-redux";
// import { setUserData } from "../redux/userSlice";
// import { useNavigate } from "react-router-dom";

// function Login() {
//   const [showPassword, setShowPassword] = useState(false);
//   let [email, setEmail] = useState("");
//   let [password, setPassword] = useState("");
//   let [loading, setLoading] = useState(false);
//   let [error, setError] = useState("");
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       let result = await axios.post(
//         `${serverUrl}/api/auth/login`,
//         { email, password },
//         { withCredentials: true }
//       );

//       dispatch(setUserData(result.data));
//       setLoading(false);
//       setError("");
//       navigate("/"); // redirect to Home
//     } catch (err) {
//       console.log(err);
//       setLoading(false);
//       setError(err.response?.data?.message || "Login failed");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 px-4">
//       <div className="w-full max-w-md bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
//         <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 h-36 flex flex-col items-center justify-center text-white rounded-b-[30%]">
//           <h2 className="text-3xl font-bold text-white">
//             Login to <span className="text-yellow-300">B Chat</span>
//           </h2>
//           <p className="text-sm mt-1 text-gray-100">Login to continue chatting!</p>
//         </div>

//         <div className="p-6 space-y-5">
//           <form className="space-y-4" onSubmit={handleLogin}>
//             <div>
//               <label className="block text-white font-medium mb-1" htmlFor="email">Email</label>
//               <input
//                 id="email"
//                 type="email"
//                 placeholder="Enter email"
//                 className="w-full px-4 py-2 border-2 bg-white/20 border-white/50 rounded-lg text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition duration-200"
//                 onChange={(e)=>setEmail(e.target.value)}
//                 value={email}
//               />
//             </div>

//             <div>
//               <label className="block text-white font-medium mb-1" htmlFor="password">Password</label>
//               <div className="relative">
//                 <input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter password"
//                   className="w-full px-4 py-2 border-2 bg-white/20 border-white/50 rounded-lg text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition duration-200 pr-10"
//                   onChange={(e)=>setPassword(e.target.value)}
//                   value={password}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute inset-y-0 right-2 px-2 flex items-center text-sm text-white hover:text-yellow-300 focus:outline-none"
//                 >
//                   {showPassword ? "Hide" : "Show"}
//                 </button>
//               </div>
//             </div>
//             {error && <p className="text-red-500">{error}</p>}

//             <div className="flex justify-center">
//               <button
//                 type="submit"
//                 className="w-1/2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 py-2 rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 transition duration-300 shadow-lg"
//                 disabled={loading}
//               >
//                {loading ? "Loading..." : "Login"}
//               </button>
//             </div>
//           </form>

//           <p className="text-center text-sm text-white/80">
//             Don’t have an account?{" "}
//             <a href="/signup" className="text-yellow-300 hover:underline">Sign Up</a>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Login;
// claude 

import React, { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { useNavigate } from "react-router-dom";

const serverUrl = "http://localhost:8000";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill all fields"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      const user = result.data;
      dispatch(setUserData(user));
      localStorage.setItem("userData", JSON.stringify(user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4 text-3xl shadow-lg shadow-violet-600/30">
            💬
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to B Chat</p>
        </div>

        <div className="bg-[#161b22] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 text-sm transition pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-violet-400 transition"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-red-400 text-sm">⚠ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <a href="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;