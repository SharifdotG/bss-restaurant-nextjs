import { BillingPage } from "@/components/billing/billing-page";
import { pageRoute } from "../app-route";

const route = pageRoute("billing", BillingPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
