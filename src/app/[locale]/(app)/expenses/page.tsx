import { ExpensesPage } from "@/components/expenses/expenses-page";
import { pageRoute } from "../app-route";

const route = pageRoute("expenses", ExpensesPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
