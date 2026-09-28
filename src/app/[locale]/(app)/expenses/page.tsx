import { plannedRoute } from "../planned-route";

const route = plannedRoute("expenses");

export const generateMetadata = route.generateMetadata;
export default route.Route;
