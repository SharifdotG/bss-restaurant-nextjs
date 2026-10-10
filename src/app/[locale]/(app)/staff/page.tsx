import { StaffPage } from "@/components/staff/staff-page";
import { pageRoute } from "../app-route";

const route = pageRoute("staff", StaffPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
