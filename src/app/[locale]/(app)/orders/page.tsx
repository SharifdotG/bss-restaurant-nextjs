import { OrdersPage } from "@/components/orders/orders-page";
import { pageRoute } from "../app-route";

const route = pageRoute("orders", OrdersPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
