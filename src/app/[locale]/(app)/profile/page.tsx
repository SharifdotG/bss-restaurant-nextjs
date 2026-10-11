import { ProfilePage } from "@/components/profile/profile-page";
import { pageRoute } from "../app-route";

const route = pageRoute("profile", ProfilePage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
