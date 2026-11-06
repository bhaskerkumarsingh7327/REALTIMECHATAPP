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
        if (localUser && localUser !== "undefined") {
          try {
            dispatch(setUserData(JSON.parse(localUser)));
            setLoading(false);
            return;
          } catch (e) {}
        }

        const res = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });

        if (res.data.user) {
          dispatch(setUserData(res.data.user));
          localStorage.setItem("userData", JSON.stringify(res.data.user));
        }
      } catch (error) {
        console.warn("Could not retrieve current user session:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  return loading;
};

export default useCurrentUser;
