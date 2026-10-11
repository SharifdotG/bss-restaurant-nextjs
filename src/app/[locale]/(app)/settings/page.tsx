import { SettingsPage } from "@/components/settings/settings-page";
import { pageRoute } from "../app-route";

const route = pageRoute("settings", SettingsPage);

export const generateMetadata = route.generateMetadata;
export default route.Route;
