import { GoogleOAuthProvider } from "@react-oauth/google";
import Spinner from "react-bootstrap/Spinner";

// i am adding suspense in the layout because one of the pages is composed of serveral different data-calling components.
export default function GuidesLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return <section className="h-full overflow-hidden flex flex-col">{children}</section>;
}
