import { Router } from "express";

import {
  actualizarPerfil,
  iniciarSesion,
  iniciarSesionGoogle,
  obtenerPerfil,
  registrar,
} from "../controllers/authController.js";

import { protegerRuta } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/registro", registrar);
router.post("/login", iniciarSesion);
router.post("/google", iniciarSesionGoogle);

router.get("/perfil", protegerRuta, obtenerPerfil);
router.put("/perfil", protegerRuta, actualizarPerfil);

export default router;