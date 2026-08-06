import { Router } from "express";
import {
  iniciarSesion,
  registrar,
} from "../controllers/authController.js";

const router = Router();

router.post("/registro", registrar);
router.post("/login", iniciarSesion);

export default router;