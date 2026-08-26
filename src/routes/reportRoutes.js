import { Router } from "express";

import {
  confirmarReporte,
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

router.post(
  "/:id/confirmar",
  confirmarReporte,
);

router.delete("/:id", eliminarReporte);

export default router;