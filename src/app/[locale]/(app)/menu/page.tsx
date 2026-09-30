import { plannedRoute } from "../app-route";

const route = plannedRoute("menu");

export const generateMetadata = route.generateMetadata;
export default route.Route;
