import { plannedRoute } from "../app-route";

const route = plannedRoute("tables");

export const generateMetadata = route.generateMetadata;
export default route.Route;
