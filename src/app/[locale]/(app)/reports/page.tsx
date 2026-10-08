import { ReportsPage } from "@/components/reports/reports-page";
import { pageRoute } from "../app-route";

const route = pageRoute("reports", ReportsPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
