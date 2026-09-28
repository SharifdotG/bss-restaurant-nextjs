import { plannedRoute } from "../planned-route";

const route = plannedRoute("kitchen");

export const generateMetadata = route.generateMetadata;
export default route.Route;
