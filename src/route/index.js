const express = require("express");
const authRoute = require("./authRoute");
const userRoute = require("./userRoute");
const numberTypeRoute = require("./numberTypeRoute");
const simInventoryRoute = require("./simInventoryRoute");
const bundleRoute = require("./bundleRoute");
const orderStatusRoute = require("./orderStatusRoute");
const salesOrderRoute = require("./salesOrderRoute");
const regionRoute = require("./regionRoute");
const cityRoute = require("./cityRoute");
const externalApiTokenRoute = require("./externalApiTokenRoute");
const roleRoute = require("./roleRoute");
const statsRoute = require("./statsRoute");
const eventStatusMappingRoute = require("./eventStatusMappingRoute");
const salesOrderAuditLogRoute = require("./salesOrderAuditLogRoute");
const cronSettingRoute = require("./cronSettingRoute");
const vapiAssistantRoute = require("./vapiAssistantRoute");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/number-types",
    route: numberTypeRoute,
  },
  {
    path: "/sim-inventory",
    route: simInventoryRoute,
  },
  {
    path: "/bundles",
    route: bundleRoute,
  },
  {
    path: "/order-statuses",
    route: orderStatusRoute,
  },
  {
    path: "/sales-orders",
    route: salesOrderRoute,
  },
  {
    path: "/regions",
    route: regionRoute,
  },
  {
    path: "/cities",
    route: cityRoute,
  },
  {
    path: "/external-api-tokens",
    route: externalApiTokenRoute,
  },
  {
    path: "/roles",
    route: roleRoute,
  },
  {
    path: "/stats",
    route: statsRoute,
  },
  {
    path: "/event-mappings",
    route: eventStatusMappingRoute,
  },
  {
    path: "/audit-trail",
    route: salesOrderAuditLogRoute,
  },
  {
    path: "/cron-settings",
    route: cronSettingRoute,
  },
  {
    path: "/vapi-assistants",
    route: vapiAssistantRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
