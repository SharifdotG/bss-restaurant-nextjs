import { MenuPage } from "@/components/menu/menu-page";
import { pageRoute } from "../app-route";

const route = pageRoute("menu", MenuPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
