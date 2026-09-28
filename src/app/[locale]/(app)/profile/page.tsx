import { plannedRoute } from "../planned-route";

const route = plannedRoute("profile");

export const generateMetadata = route.generateMetadata;
export default route.Route;
