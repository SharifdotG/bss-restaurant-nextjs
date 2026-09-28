import { plannedRoute } from "../planned-route";

const route = plannedRoute("orders");

export const generateMetadata = route.generateMetadata;
export default route.Route;
