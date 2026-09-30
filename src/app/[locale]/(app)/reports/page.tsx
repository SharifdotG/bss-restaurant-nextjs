import { plannedRoute } from "../app-route";

const route = plannedRoute("reports");

export const generateMetadata = route.generateMetadata;
export default route.Route;
