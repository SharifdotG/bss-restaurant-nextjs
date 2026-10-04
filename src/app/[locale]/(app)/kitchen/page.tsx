import { KitchenPage } from "@/components/kitchen/kitchen-page";
import { pageRoute } from "../app-route";

const route = pageRoute("kitchen", KitchenPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
