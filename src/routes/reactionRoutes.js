import { Router } from "express";

import {
  reaccionar,
  obtenerReacciones,
} from "../controllers/reactionController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

// Obtener resumen de reacciones + reacción del usuario
router.get("/", obtenerReacciones);

// Crear, cambiar o quitar una reacción
router.post("/", reaccionar);

export default router;