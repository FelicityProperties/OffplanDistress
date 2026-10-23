import admin from "./admin";
import auth from "./auth";
import common from "./common";
import dashboard from "./dashboard";
import deal from "./deal";
import deals from "./deals";
import errors from "./errors";
import home from "./home";
import legal from "./legal";
import marketing from "./marketing";
import notifications from "./notifications";
import password from "./password";
import searches from "./searches";
import sell from "./sell";

// One namespace per area of the app; each file owns its English + Arabic copy.
export const messages = {
  admin,
  auth,
  common,
  dashboard,
  deal,
  deals,
  errors,
  home,
  legal,
  marketing,
  notifications,
  password,
  searches,
  sell,
};

export type Messages = typeof messages;
export type Namespace = keyof Messages;
export type Dict<N extends Namespace> = Messages[N]["en"];
