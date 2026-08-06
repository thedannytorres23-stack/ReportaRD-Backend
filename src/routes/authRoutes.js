import { Router } from "express";
import {
  iniciarSesion,
  obtenerPerfil,
  registrar,
} from "../controllers/authController.js";
import { protegerRuta } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/registro", registrar);
router.post("/login", iniciarSesion);
router.get("/perfil", protegerRuta, obtenerPerfil);

export default router;