import { Router } from "express";

import {
  crearPublicacion,
  listarPublicaciones,
} from "../controllers/postController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

router.get("/", listarPublicaciones);

router.post("/", crearPublicacion);

export default router;