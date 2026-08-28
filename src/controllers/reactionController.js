import mongoose from "mongoose";

import Reaction from "../models/Reaction.js";

import Post from "../models/Post.js";

import Report from "../models/Report.js";

import {
  crearNotificacion,
} from "../services/notificationService.js";

const REACCIONES_PUBLICACION = [
  "me_importa",
  "buena_idea",
  "buen_aporte",
  "impactante",
  "indignante",
  "apoyo_ciudadano",
];

const REACCIONES_REPORTE = [
  "me_preocupa",
  "tengo_solucion",
  "puedo_ayudar",
  "difundir",
  "autoridad",
  "apoyo_ciudadano",
];

const obtenerModeloContenido = (tipoContenido) => {
  if (tipoContenido === "post") return Post;

  if (tipoContenido === "report") return Report;

  return null;
};

const obtenerReaccionesPermitidas = (
  tipoContenido,
) => {
  if (tipoContenido === "post") {
    return REACCIONES_PUBLICACION;
  }

  if (tipoContenido === "report") {
    return REACCIONES_REPORTE;
  }

  return [];
};

const obtenerResumen = async (
  tipoContenido,
  contenidoId,
) => {
  const resultados = await Reaction.aggregate([
    {
      $match: {
        tipoContenido,
        contenidoId:
          new mongoose.Types.ObjectId(
            contenidoId,
          ),
      },
    },
    {
      $group: {
        _id: "$tipoReaccion",
        cantidad: {
          $sum: 1,
        },
      },
    },
  ]);

  const resumen = {};

  let total = 0;

  resultados.forEach((resultado) => {
    resumen[resultado._id] =
      resultado.cantidad;

    total += resultado.cantidad;
  });

  return {
    total,
    resumen,
  };
};

export const reaccionar = async (
  req,
  res,
) => {
  try {
    const {
      tipoContenido,
      contenidoId,
      tipoReaccion,
    } = req.body;

    if (
      !tipoContenido ||
      !contenidoId ||
      !tipoReaccion
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Faltan datos para registrar la reacción.",
      });
    }

    if (
      !mongoose.isValidObjectId(contenidoId)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El contenido indicado no es válido.",
      });
    }

    const ModeloContenido =
      obtenerModeloContenido(tipoContenido);

    if (!ModeloContenido) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Tipo de contenido inválido.",
      });
    }

    const reaccionesPermitidas =
      obtenerReaccionesPermitidas(
        tipoContenido,
      );

    if (
      !reaccionesPermitidas.includes(
        tipoReaccion,
      )
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La reacción seleccionada no es válida.",
      });
    }

    const contenido =
      await ModeloContenido.findById(
        contenidoId,
      );

    if (!contenido) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "La publicación o reporte no existe.",
      });
    }

    const reaccionExistente =
      await Reaction.findOne({
        autor: req.usuario._id,
        tipoContenido,
        contenidoId,
      });

    let miReaccion = null;

    let accion = "";

    if (!reaccionExistente) {
      await Reaction.create({
        autor: req.usuario._id,
        tipoContenido,
        contenidoId,
        tipoReaccion,
      });

      miReaccion = tipoReaccion;

      accion = "creada";

      /*
       * Solo una reacción NUEVA genera
       * una notificación.
       *
       * Cambiarla o eliminarla no genera
       * notificaciones adicionales.
       */

      const nombreContenido =
        tipoContenido === "post"
          ? "publicación"
          : "reporte";

      await crearNotificacion({
        usuario: contenido.autor,
        emisor: req.usuario._id,
        tipo: "reaccion",
        mensaje: `reaccionó a tu ${nombreContenido}.`,
        tipoContenido,
        contenidoId,
      });
    } else if (
      reaccionExistente.tipoReaccion ===
      tipoReaccion
    ) {
      await Reaction.findByIdAndDelete(
        reaccionExistente._id,
      );

      miReaccion = null;

      accion = "eliminada";
    } else {
      reaccionExistente.tipoReaccion =
        tipoReaccion;

      await reaccionExistente.save();

      miReaccion = tipoReaccion;

      accion = "cambiada";
    }

    const {
      total,
      resumen,
    } = await obtenerResumen(
      tipoContenido,
      contenidoId,
    );

    return res.status(200).json({
      ok: true,
      accion,
      total,
      resumen,
      miReaccion,
    });
  } catch (error) {
    console.error(
      "Error registrando reacción:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo registrar la reacción.",
    });
  }
};

export const obtenerReacciones = async (
  req,
  res,
) => {
  try {
    const {
      tipoContenido,
      contenidoId,
    } = req.query;

    if (
      !tipoContenido ||
      !contenidoId
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Falta identificar el contenido.",
      });
    }

    if (
      !mongoose.isValidObjectId(contenidoId)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El contenido indicado no es válido.",
      });
    }

    const ModeloContenido =
      obtenerModeloContenido(tipoContenido);

    if (!ModeloContenido) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Tipo de contenido inválido.",
      });
    }

    const contenido =
      await ModeloContenido.exists({
        _id: contenidoId,
      });

    if (!contenido) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "La publicación o reporte no existe.",
      });
    }

    const {
      total,
      resumen,
    } = await obtenerResumen(
      tipoContenido,
      contenidoId,
    );

    const reaccionUsuario =
      await Reaction.findOne({
        autor: req.usuario._id,
        tipoContenido,
        contenidoId,
      }).lean();

    return res.status(200).json({
      ok: true,
      total,
      resumen,
      miReaccion:
        reaccionUsuario?.tipoReaccion ||
        null,
    });
  } catch (error) {
    console.error(
      "Error obteniendo reacciones:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron obtener las reacciones.",
    });
  }
};