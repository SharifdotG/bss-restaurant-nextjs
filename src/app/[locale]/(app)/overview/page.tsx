import { OverviewPage } from "@/components/overview/overview-page";
import { pageRoute } from "../app-route";

const route = pageRoute("overview", OverviewPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
