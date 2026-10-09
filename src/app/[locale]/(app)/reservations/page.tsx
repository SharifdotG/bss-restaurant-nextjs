import { ReservationsPage } from "@/components/reservations/reservations-page";
import { pageRoute } from "../app-route";

const route = pageRoute("reservations", ReservationsPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
