import { Router } from "express";

import {
  crearHistoria,
  eliminarHistoria,
  listarHistorias,
  registrarVista,
} from "../controllers/historiaController.js";

import { protegerRuta } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

router.get("/", listarHistorias);

router.post("/", crearHistoria);

router.post(
  "/:id/vista",
  registrarVista,
);

router.delete(
  "/:id",
  eliminarHistoria,
);

export default router;