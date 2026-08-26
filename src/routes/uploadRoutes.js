import { Router } from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
  subirArchivo,
} from "../controllers/uploadController.js";
import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

router.post(
  "/",
  protegerRuta,
  upload.single("archivo"),
  subirArchivo,
);

export default router;