import { plannedRoute } from "../app-route";

const route = plannedRoute("floor");

export const generateMetadata = route.generateMetadata;
export default route.Route;
