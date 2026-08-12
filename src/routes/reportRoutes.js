import { Router } from "express";

import {
  crearReporte,
  listarReportes,
} from "../controllers/reportController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

router.get("/", listarReportes);

router.post("/", crearReporte);

export default router;