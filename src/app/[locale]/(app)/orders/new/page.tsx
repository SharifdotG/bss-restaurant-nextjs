import { plannedRoute } from "../../app-route";

const route = plannedRoute("newOrder");

export const generateMetadata = route.generateMetadata;
export default route.Route;
