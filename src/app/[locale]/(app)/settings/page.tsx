import { plannedRoute } from "../planned-route";

const route = plannedRoute("settings");

export const generateMetadata = route.generateMetadata;
export default route.Route;
