import { useLocation } from "react-router-dom";
import { Footer } from "./Footer";

export const ConditionalFooter = () => {
  const location = useLocation();

  if (location.pathname === '/messages') {
    return null;
  }

  return <Footer />;
};
