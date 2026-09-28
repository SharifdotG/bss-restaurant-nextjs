import { plannedRoute } from "../planned-route";

const route = plannedRoute("billing");

export const generateMetadata = route.generateMetadata;
export default route.Route;
