import { PosPage } from "@/components/pos/pos-page";
import { pageRoute } from "../../app-route";

const route = pageRoute("newOrder", PosPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
