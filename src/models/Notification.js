import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    emisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tipo: {
      type: String,
      enum: [
        "comentario",
        "respuesta",
        "reaccion",
        "confirmacion",
        "seguimiento",
        "mensaje",
      ],
      required: true,
      index: true,
    },

    mensaje: {
      type: String,
      required: true,
      trim: true,
    },

    tipoContenido: {
      type: String,
      enum: ["post", "report", null],
      default: null,
    },

    contenidoId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    comentarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    leida: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.index({
  usuario: 1,
  leida: 1,
  createdAt: -1,
});

notificationSchema.index({
  usuario: 1,
  createdAt: -1,
});

const Notification = mongoose.model(
  "Notification",
  notificationSchema,
);

export default Notification;