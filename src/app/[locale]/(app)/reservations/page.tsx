import { plannedRoute } from "../app-route";

const route = plannedRoute("reservations");

export const generateMetadata = route.generateMetadata;
export default route.Route;
