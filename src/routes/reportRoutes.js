import { Router } from "express";

import {
  crearReporte,
  eliminarReporte,
  listarReportes,
} from "../controllers/reportController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

router.get("/", listarReportes);
router.post("/", crearReporte);
router.delete("/:id", eliminarReporte);

export default router;