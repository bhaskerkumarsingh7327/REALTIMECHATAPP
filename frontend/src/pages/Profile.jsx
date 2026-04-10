// import React from 'react'

// function Profile() {
//   return (
//     <div className='w-full h-[100vh] bg-slate-100 flex flex-col justify-center items-center'>
//     <div className='w-[200px]h-[200px] bg-white rounded-full border-2 border-[#20c7ff] shadow-gray-400'>

//     </div>
//     <form action="">

//     </form>
//         </div>
//   )
// }

// export default Profile 

// import React, { useState } from "react";
// import { useSelector } from "react-redux";

// function Profile() {
//   const { userData } = useSelector((state) => state.user); // Redux se user data
//   const [image, setImage] = useState(null);
//   const [preview, setPreview] = useState(null);

//   const [formData, setFormData] = useState({
//     name: userData?.username || "",
//     username: userData?.username || "",
//     dob: userData?.dob || "",
//     email: userData?.email || ""
//   });

//   // Image select handler
//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     setImage(file);
//     setPreview(URL.createObjectURL(file));
//   };

//   // Input change handler
//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   // Save button (abhi backend nahi connected, sirf console log karega)
//   const handleSave = (e) => {
//     e.preventDefault();
//     console.log("Profile Data:", formData);
//     console.log("Selected Image:", image);
//     alert("Profile Updated ✅");
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4">
//       <div className="bg-white shadow-2xl rounded-2xl w-full max-w-lg p-8">
//         {/* Header */}
//         <h2 className="text-3xl font-bold text-center text-indigo-600 mb-6">
//           My Profile
//         </h2>

//         {/* Profile Image */}
//         <div className="flex flex-col items-center">
//           <div className="relative">
//             <img
//               src={
//                 preview ||
//                 userData?.avatar || // agar backend se avatar aaye
//                 "https://www.w3schools.com/howto/img_avatar.png"
//               }
//               alt="Profile"
//               className="w-28 h-28 rounded-full border-4 border-indigo-500 object-cover"
//             />
//             <label
//               htmlFor="imageUpload"
//               className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full cursor-pointer shadow-lg hover:bg-indigo-700"
//             >
//               Change
//             </label>
//             <input
//               type="file"
//               id="imageUpload"
//               accept="image/*"
//               className="hidden"
//               onChange={handleImageChange}
//             />
//           </div>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSave} className="mt-8 space-y-5">
//           {/* Name */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Name</label>
//             <input
//               type="text"
//               name="name"
//               value={formData.name}
//               onChange={handleChange}
//               placeholder="Enter full name"
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* Username */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Username</label>
//             <input
//               type="text"
//               name="username"
//               value={formData.username}
//               onChange={handleChange}
//               placeholder="Enter username"
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* DOB */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Date of Birth</label>
//             <input
//               type="date"
//               name="dob"
//               value={formData.dob}
//               onChange={handleChange}
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* Email */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Email</label>
//             <input
//               type="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               placeholder="Enter email"
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* Save Button */}
//           <div className="flex justify-center">
//             <button
//               type="submit"
//               className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-600 transition duration-300"
//             >
//               Save Changes
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default Profile;



// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import { setUserData } from "../redux/userSlice"; // ✅ apna userSlice ka action import

// function Profile() {
//   const { userData } = useSelector((state) => state.user);
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const [image, setImage] = useState(null);
//   const [preview, setPreview] = useState(null);

//   const [formData, setFormData] = useState({
//     name: userData?.name || "",
//     username: userData?.username || "",
//     dob: userData?.dob || "",
//     email: userData?.email || "",
//   });

//   // Image select handler
//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     setImage(file);
//     setPreview(URL.createObjectURL(file));
//   };

//   // Input change handler
//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   // Save button
//   const handleSave = (e) => {
//     e.preventDefault();

//     // ✅ Redux me update karna
//     dispatch(
//       setUserData({
//         ...formData,
//         avatar: preview || userData?.avatar, // agar nayi image select ki ho to preview
//       })
//     );

//     alert("Profile Updated ✅");

//     navigate("/"); // ✅ Home page redirect
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4">
//       <div className="bg-white shadow-2xl rounded-2xl w-full max-w-lg p-8">
//         {/* Header */}
//         <h2 className="text-3xl font-bold text-center text-indigo-600 mb-6">
//           My Profile
//         </h2>

//         {/* Profile Image */}
//         <div className="flex flex-col items-center">
//           <div className="relative">
//             <img
//               src={
//                 preview ||
//                 userData?.avatar ||
//                 "https://www.w3schools.com/howto/img_avatar.png"
//               }
//               alt="Profile"
//               className="w-28 h-28 rounded-full border-4 border-indigo-500 object-cover"
//             />
//             <label
//               htmlFor="imageUpload"
//               className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full cursor-pointer shadow-lg hover:bg-indigo-700"
//             >
//               Change
//             </label>
//             <input
//               type="file"
//               id="imageUpload"
//               accept="image/*"
//               className="hidden"
//               onChange={handleImageChange}
//             />
//           </div>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSave} className="mt-8 space-y-5">
//           {/* Name */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Name</label>
//             <input
//               type="text"
//               name="name"
//               value={formData.name}
//               onChange={handleChange}
//               placeholder="Enter full name"
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* Username */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Username</label>
//             <input
//               type="text"
//               name="username"
//               value={formData.username}
//               onChange={handleChange}
//               placeholder="Enter username"
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* DOB */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Date of Birth</label>
//             <input
//               type="date"
//               name="dob"
//               value={formData.dob}
//               onChange={handleChange}
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* Email */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-1">Email</label>
//             <input
//               type="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               placeholder="Enter email"
//               className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           {/* Save Button */}
//           <div className="flex justify-center">
//             <button
//               type="submit"
//               className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-600 transition duration-300"
//             >
//               Save Changes
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default Profile;



// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import { setUserData } from "../redux/userSlice";

// function Profile() {
//   const { userData } = useSelector((state) => state.user);
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const [image, setImage] = useState(null);
//   const [preview, setPreview] = useState(userData?.avatar || null);
//   const [showPopup, setShowPopup] = useState(false);

//   const [formData, setFormData] = useState({
//     name: userData?.name || "",
//     username: userData?.username || "",
//     dob: userData?.dob || "",
//     email: userData?.email || "",
//   });

//   // Image select handler
//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setImage(file);
//       setPreview(URL.createObjectURL(file));
//     }
//   };

//   // Input change handler
//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   // Save button
//   const handleSave = (e) => {
//     e.preventDefault();

//     dispatch(
//       setUserData({
//         ...formData,
//         avatar: preview || userData?.avatar,
//       })
//     );

//     // Show popup
//     setShowPopup(true);

//     // Auto redirect after 10s
//     setTimeout(() => {
//       if (showPopup) {
//         setShowPopup(false);
//         navigate("/");
//       }
//     }, 10000);
//   };

//   // Close popup manually
//   const handleClosePopup = () => {
//     setShowPopup(false);
//     navigate("/");
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500">
//       <div className="bg-white/30 backdrop-blur-xl shadow-2xl rounded-3xl w-full max-w-lg p-8">
//         {/* Header */}
//         <h2 className="text-4xl font-extrabold text-center text-white drop-shadow-lg mb-6">
//           My Profile
//         </h2>

//         {/* Profile Image */}
//         <div className="flex flex-col items-center">
//           <div className="relative group">
//             <img
//               src={preview || "https://www.w3schools.com/howto/img_avatar.png"}
//               alt="Profile"
//               className="w-32 h-32 rounded-full border-4 border-indigo-600 object-cover shadow-lg"
//             />
//             <label
//               htmlFor="imageUpload"
//               className="absolute bottom-2 right-2 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full cursor-pointer shadow-md hover:bg-indigo-700 transition"
//             >
//               Change
//             </label>
//             <input
//               type="file"
//               id="imageUpload"
//               accept="image/*"
//               className="hidden"
//               onChange={handleImageChange}
//             />
//           </div>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSave} className="mt-8 space-y-5">
//           <div>
//             <label className="block text-white font-medium mb-1">Name</label>
//             <input
//               type="text"
//               name="name"
//               value={formData.name}
//               onChange={handleChange}
//               placeholder="Enter full name"
//               className="w-full px-4 py-2 border-2 border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           <div>
//             <label className="block text-white font-medium mb-1">Username</label>
//             <input
//               type="text"
//               name="username"
//               value={formData.username}
//               onChange={handleChange}
//               placeholder="Enter username"
//               className="w-full px-4 py-2 border-2 border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           <div>
//             <label className="block text-white font-medium mb-1">Date of Birth</label>
//             <input
//               type="date"
//               name="dob"
//               value={formData.dob}
//               onChange={handleChange}
//               className="w-full px-4 py-2 border-2 border-white/50 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           <div>
//             <label className="block text-white font-medium mb-1">Email</label>
//             <input
//               type="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               placeholder="Enter email"
//               className="w-full px-4 py-2 border-2 border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           <div className="flex justify-center">
//             <button
//               type="submit"
//               className="w-1/2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-violet-700 shadow-lg transition duration-300"
//             >
//               Save Changes
//             </button>
//           </div>
//         </form>
//       </div>

//       {/* Success Popup */}
//       {showPopup && (
//         <div className="fixed inset-0 flex items-center justify-center z-50">
//           <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-lg animate-fadeInOut text-center relative">
//             <h3 className="text-lg font-bold">Profile Updated ✅</h3>
//             <p className="text-sm mt-1">Redirecting to Home...</p>
//             <button
//               onClick={handleClosePopup}
//               className="absolute top-2 right-2 text-white text-lg font-bold hover:text-gray-200 transition"
//             >
//               ✕
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Profile;
// claudencode 
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData } from "../redux/userSlice";

function Profile() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(userData?.avatar || null);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    name: userData?.name || "",
    username: userData?.username || "",
    dob: userData?.dob || "",
    email: userData?.email || "",
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = { ...userData, ...formData, avatar: preview || userData?.avatar };
    dispatch(setUserData(updated));
    localStorage.setItem("userData", JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition"
        >
          ← Back to chats
        </button>

        <div className="bg-[#161b22] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Your Profile</h2>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <img
                src={preview || "https://www.w3schools.com/howto/img_avatar.png"}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover ring-2 ring-violet-500 ring-offset-2 ring-offset-[#161b22]"
              />
              <label
                htmlFor="imageUpload"
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center cursor-pointer transition shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
              <input type="file" id="imageUpload" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
            <p className="text-sm text-gray-500 mt-3">Click the camera to change photo</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { label: "Full Name", name: "name", type: "text", placeholder: "Your full name" },
              { label: "Username", name: "username", type: "text", placeholder: "your_username" },
              { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
              { label: "Date of Birth", name: "dob", type: "date", placeholder: "" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 text-sm transition"
                />
              </div>
            ))}

            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-semibold text-sm transition shadow-lg mt-2 ${
                saved
                  ? "bg-green-600 text-white shadow-green-600/20"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20"
              }`}
            >
              {saved ? "✓ Saved! Redirecting..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;