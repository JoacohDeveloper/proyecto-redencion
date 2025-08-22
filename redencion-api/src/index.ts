import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PORT } from "./config/constants";
import * as Router from "../Router/routerMap";
import { tenantMiddleware } from "../middlewares/tenantmiddleware";

const app = express();
dotenv.config();

//format middlewares
app.use(express.json(), cors());

//tenant middleware
app.use(tenantMiddleware);

app.use("/api/common", Router.commonRoutes);
app.use("/api/info/", Router.infoRoutes);
app.use("/api/stores/", Router.storeRoutes);
app.use("/api/services/", Router.serviceRoutes);

app.listen(PORT, () => {
  console.log(`Listen on port ${PORT}.`);
});
