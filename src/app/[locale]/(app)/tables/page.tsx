import { TablesPage } from "@/components/tables/tables-page";
import { pageRoute } from "../app-route";

const route = pageRoute("tables", TablesPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
