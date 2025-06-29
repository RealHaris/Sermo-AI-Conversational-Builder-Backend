const express = require("express");
const assistantRoute = require("./assistantRoute");
const chatRoute = require("./chatRoute");
const callRoute = require("./callRoute");
const webhookRoute = require("./webhookRoute");
const router = express.Router();

const defaultRoutes = [
  {
    path: "/assistants",
    route: assistantRoute,
  },
  {
    path: "/chats",
    route: chatRoute,
  },
  {
    path: "/calls",
    route: callRoute,
  },
  {
    path: "/webhooks",
    route: webhookRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
