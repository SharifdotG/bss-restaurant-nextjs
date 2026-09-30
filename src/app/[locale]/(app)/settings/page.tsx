import { plannedRoute } from "../app-route";

const route = plannedRoute("settings");

export const generateMetadata = route.generateMetadata;
export default route.Route;
