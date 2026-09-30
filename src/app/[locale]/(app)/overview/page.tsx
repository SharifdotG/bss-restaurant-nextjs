import { plannedRoute } from "../app-route";

const route = plannedRoute("overview");

export const generateMetadata = route.generateMetadata;
export default route.Route;
