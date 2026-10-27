import admin from "./admin";
import analytics from "./analytics";
import auth from "./auth";
import common from "./common";
import dashboard from "./dashboard";
import deal from "./deal";
import deals from "./deals";
import errors from "./errors";
import exit from "./exit";
import home from "./home";
import intake from "./intake";
import legal from "./legal";
import market from "./market";
import marketing from "./marketing";
import notifications from "./notifications";
import password from "./password";
import searches from "./searches";
import sell from "./sell";

// One namespace per area of the app; each file owns its English + Arabic copy.
export const messages = {
  admin,
  analytics,
  auth,
  common,
  dashboard,
  deal,
  deals,
  errors,
  exit,
  home,
  intake,
  legal,
  market,
  marketing,
  notifications,
  password,
  searches,
  sell,
};

export type Messages = typeof messages;
export type Namespace = keyof Messages;
export type Dict<N extends Namespace> = Messages[N]["en"];
