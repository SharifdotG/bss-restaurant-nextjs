import { plannedRoute } from "../planned-route";

const route = plannedRoute("staff");

export const generateMetadata = route.generateMetadata;
export default route.Route;
