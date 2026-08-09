import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const CAMPOS_USUARIO =
  "nombre usuario foto activo ultimaActividad";

const esIdValido = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const usuarioPertenece = (conversacion, usuarioId) => {
  return conversacion.participantes.some(
    (participante) =>
      participante.toString() === usuarioId.toString(),
  );
};

// Crear o recuperar un chat privado
export const crearChatPrivado = async (req, res) => {
  try {
    const { usuarioId } = req.body;
    const usuarioActualId = req.usuario._id;

    if (!usuarioId || !esIdValido(usuarioId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes seleccionar un usuario válido.",
      });
    }

    if (usuarioId === usuarioActualId.toString()) {
      return res.status(400).json({
        ok: false,
        mensaje: "No puedes iniciar un chat contigo mismo.",
      });
    }

    const destinatario = await User.findById(usuarioId);

    if (!destinatario) {
      return res.status(404).json({
        ok: false,
        mensaje: "El usuario seleccionado no existe.",
      });
    }

    const conversacionExistente = await Conversation.findOne({
      tipo: "privado",
      participantes: {
        $all: [usuarioActualId, usuarioId],
        $size: 2,
      },
      activa: true,
    })
      .populate("participantes", CAMPOS_USUARIO)
      .populate("ultimoMensaje");

    if (conversacionExistente) {
      return res.status(200).json({
        ok: true,
        mensaje: "Conversación encontrada.",
        conversacion: conversacionExistente,
      });
    }

    const conversacion = await Conversation.create({
      tipo: "privado",
      participantes: [usuarioActualId, usuarioId],
      creadoPor: usuarioActualId,
    });

    await conversacion.populate(
      "participantes",
      CAMPOS_USUARIO,
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Conversación creada correctamente.",
      conversacion,
    });
  } catch (error) {
    console.error(
      "Error creando conversación:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear la conversación.",
    });
  }
};

// Crear un grupo
export const crearGrupo = async (req, res) => {
  try {
    const {
      nombre,
      descripcion = "",
      foto = "",
      participantes = [],
    } = req.body;

    const usuarioActualId = req.usuario._id;

    if (!nombre?.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: "El grupo necesita un nombre.",
      });
    }

    if (!Array.isArray(participantes)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Los participantes no son válidos.",
      });
    }

    const idsValidos = participantes.filter(
      (id) =>
        esIdValido(id) &&
        id !== usuarioActualId.toString(),
    );

    const idsUnicos = [
      usuarioActualId.toString(),
      ...new Set(idsValidos),
    ];

    if (idsUnicos.length < 3) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El grupo debe tener al menos tres participantes.",
      });
    }

    const usuariosExistentes = await User.countDocuments({
      _id: {
        $in: idsUnicos,
      },
    });

    if (usuariosExistentes !== idsUnicos.length) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Uno o más participantes no existen.",
      });
    }

    const grupo = await Conversation.create({
      tipo: "grupo",
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      foto,
      participantes: idsUnicos,
      administradores: [usuarioActualId],
      creadoPor: usuarioActualId,
    });

    await grupo.populate(
      "participantes",
      CAMPOS_USUARIO,
    );

    await grupo.populate(
      "administradores",
      CAMPOS_USUARIO,
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Grupo creado correctamente.",
      conversacion: grupo,
    });
  } catch (error) {
    console.error("Error creando grupo:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear el grupo.",
    });
  }
};

// Obtener las conversaciones del usuario
export const listarConversaciones = async (
  req,
  res,
) => {
  try {
    const conversaciones = await Conversation.find({
      participantes: req.usuario._id,
      activa: true,
    })
      .populate("participantes", CAMPOS_USUARIO)
      .populate({
        path: "ultimoMensaje",
        populate: {
          path: "autor",
          select: CAMPOS_USUARIO,
        },
      })
      .sort({
        updatedAt: -1,
      });

    return res.status(200).json({
      ok: true,
      total: conversaciones.length,
      conversaciones,
    });
  } catch (error) {
    console.error(
      "Error consultando conversaciones:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron consultar los chats.",
    });
  }
};

// Obtener una conversación y sus mensajes
export const obtenerConversacion = async (
  req,
  res,
) => {
  try {
    const { conversacionId } = req.params;

    if (!esIdValido(conversacionId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "La conversación no es válida.",
      });
    }

    const conversacion = await Conversation.findById(
      conversacionId,
    )
      .populate("participantes", CAMPOS_USUARIO)
      .populate("administradores", CAMPOS_USUARIO);

    if (!conversacion || !conversacion.activa) {
      return res.status(404).json({
        ok: false,
        mensaje: "La conversación no existe.",
      });
    }

    const pertenece = conversacion.participantes.some(
      (participante) =>
        participante._id.toString() ===
        req.usuario._id.toString(),
    );

    if (!pertenece) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No tienes acceso a esta conversación.",
      });
    }

    const limiteSolicitado = Number(
      req.query.limite || 30,
    );

    const limite = Math.min(
      Math.max(limiteSolicitado, 1),
      100,
    );

    const antesDe = req.query.antesDe
      ? new Date(req.query.antesDe)
      : null;

    const filtroMensajes = {
      conversacion: conversacionId,
      eliminadoParaTodos: false,
      eliminadoPor: {
        $ne: req.usuario._id,
      },
    };

    if (
      antesDe &&
      !Number.isNaN(antesDe.getTime())
    ) {
      filtroMensajes.createdAt = {
        $lt: antesDe,
      };
    }

    const mensajes = await Message.find(
      filtroMensajes,
    )
      .populate("autor", CAMPOS_USUARIO)
      .populate({
        path: "respondeA",
        populate: {
          path: "autor",
          select: CAMPOS_USUARIO,
        },
      })
      .sort({
        createdAt: -1,
      })
      .limit(limite);

    return res.status(200).json({
      ok: true,
      conversacion,
      mensajes: mensajes.reverse(),
      hayMas: mensajes.length === limite,
    });
  } catch (error) {
    console.error(
      "Error obteniendo conversación:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo consultar la conversación.",
    });
  }
};

// Enviar y almacenar un mensaje
export const enviarMensaje = async (req, res) => {
  try {
    const { conversacionId } = req.params;

    const {
      contenido = "",
      tipo = "texto",
      archivo,
      respondeA = null,
    } = req.body;

    if (!esIdValido(conversacionId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "La conversación no es válida.",
      });
    }

    const conversacion = await Conversation.findById(
      conversacionId,
    );

    if (!conversacion || !conversacion.activa) {
      return res.status(404).json({
        ok: false,
        mensaje: "La conversación no existe.",
      });
    }

    if (
      !usuarioPertenece(
        conversacion,
        req.usuario._id,
      )
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No puedes enviar mensajes a esta conversación.",
      });
    }

    const tiposPermitidos = [
      "texto",
      "imagen",
      "video",
      "audio",
      "archivo",
    ];

    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El tipo de mensaje no es válido.",
      });
    }

    if (
      respondeA &&
      !esIdValido(respondeA)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El mensaje respondido no es válido.",
      });
    }

    if (respondeA) {
      const mensajeRespondido =
        await Message.findOne({
          _id: respondeA,
          conversacion: conversacionId,
        });

      if (!mensajeRespondido) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "El mensaje que intentas responder no existe.",
        });
      }
    }

    const mensaje = await Message.create({
      conversacion: conversacionId,
      autor: req.usuario._id,
      tipo,
      contenido,
      archivo,
      respondeA,
      leidoPor: [
        {
          usuario: req.usuario._id,
          fecha: new Date(),
        },
      ],
    });

    conversacion.ultimoMensaje = mensaje._id;

    await conversacion.save();

    await mensaje.populate(
      "autor",
      CAMPOS_USUARIO,
    );

    if (mensaje.respondeA) {
      await mensaje.populate({
        path: "respondeA",
        populate: {
          path: "autor",
          select: CAMPOS_USUARIO,
        },
      });
    }



const io = req.app.get("io");

if (io) {
  io
    .to(`conversacion:${conversacionId}`)
    .emit("mensaje:nuevo", {
      conversacionId,
      mensaje,
    });
}



    return res.status(201).json({
      ok: true,
      mensaje: "Mensaje enviado correctamente.",
      datos: mensaje,
    });
  } catch (error) {
    console.error(
      "Error enviando mensaje:",
      error.message,
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        ok: false,
        mensaje:
          Object.values(error.errors)[0]?.message ||
          "El mensaje no es válido.",
      });
    }

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo enviar el mensaje.",
    });
  }
};

// Marcar mensajes como leídos
export const marcarComoLeidos = async (
  req,
  res,
) => {
  try {
    const { conversacionId } = req.params;

    if (!esIdValido(conversacionId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "La conversación no es válida.",
      });
    }

    const conversacion = await Conversation.findById(
      conversacionId,
    );

    if (
      !conversacion ||
      !usuarioPertenece(
        conversacion,
        req.usuario._id,
      )
    ) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "No tienes acceso a esta conversación.",
      });
    }

    const resultado = await Message.updateMany(
      {
        conversacion: conversacionId,
        autor: {
          $ne: req.usuario._id,
        },
        "leidoPor.usuario": {
          $ne: req.usuario._id,
        },
      },
      {
        $push: {
          leidoPor: {
            usuario: req.usuario._id,
            fecha: new Date(),
          },
        },
      },
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Mensajes marcados como leídos.",
      actualizados: resultado.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Error marcando mensajes:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron actualizar los mensajes.",
    });
  }
};