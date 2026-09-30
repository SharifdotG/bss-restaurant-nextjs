import { FloorPage } from "@/components/floor/floor-page";
import { pageRoute } from "../app-route";

const route = pageRoute("floor", FloorPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
