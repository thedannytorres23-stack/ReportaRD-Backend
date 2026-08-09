import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";

const usuariosConectados = new Map();

const autenticarSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(
        "Bearer ",
        "",
      );

    if (!token) {
      return next(
        new Error("Debes iniciar sesión."),
      );
    }

    const datosToken = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    const usuario = await User.findById(
      datosToken.id,
    );

    if (!usuario) {
      return next(
        new Error("El usuario ya no existe."),
      );
    }

    socket.usuario = usuario;

    return next();
  } catch {
    return next(
      new Error("La sesión no es válida o expiró."),
    );
  }
};

const configurarChatSocket = (io) => {
  io.use(autenticarSocket);

  io.on("connection", async (socket) => {
    const usuarioId =
      socket.usuario._id.toString();

    usuariosConectados.set(
      usuarioId,
      socket.id,
    );

    socket.join(`usuario:${usuarioId}`);

    socket.broadcast.emit(
      "usuario:estado",
      {
        usuarioId,
        activo: true,
        ultimaActividad: new Date(),
      },
    );

    await User.findByIdAndUpdate(usuarioId, {
      activo: true,
      ultimaActividad: new Date(),
    });

    socket.on(
      "conversacion:entrar",
      async (conversacionId) => {
        try {
          const conversacion =
            await Conversation.findOne({
              _id: conversacionId,
              participantes: usuarioId,
              activa: true,
            });

          if (!conversacion) {
            socket.emit("chat:error", {
              mensaje:
                "No tienes acceso a esta conversación.",
            });

            return;
          }

          socket.join(
            `conversacion:${conversacionId}`,
          );

          socket.emit(
            "conversacion:entrada",
            {
              conversacionId,
            },
          );
        } catch {
          socket.emit("chat:error", {
            mensaje:
              "No se pudo abrir la conversación.",
          });
        }
      },
    );

    socket.on(
      "conversacion:salir",
      (conversacionId) => {
        socket.leave(
          `conversacion:${conversacionId}`,
        );
      },
    );

    socket.on(
      "mensaje:escribiendo",
      async ({
        conversacionId,
        escribiendo,
      }) => {
        try {
          const conversacion =
            await Conversation.exists({
              _id: conversacionId,
              participantes: usuarioId,
              activa: true,
            });

          if (!conversacion) return;

          socket
            .to(
              `conversacion:${conversacionId}`,
            )
            .emit("mensaje:escribiendo", {
              conversacionId,
              usuarioId,
              nombre: socket.usuario.nombre,
              escribiendo: Boolean(escribiendo),
            });
        } catch {
          // Ignoramos eventos inválidos de escritura.
        }
      },
    );

    socket.on("disconnect", async () => {
      usuariosConectados.delete(usuarioId);

      const ultimaActividad = new Date();

      await User.findByIdAndUpdate(
        usuarioId,
        {
          activo: false,
          ultimaActividad,
        },
      );

      socket.broadcast.emit(
        "usuario:estado",
        {
          usuarioId,
          activo: false,
          ultimaActividad,
        },
      );
    });
  });
};

export default configurarChatSocket;