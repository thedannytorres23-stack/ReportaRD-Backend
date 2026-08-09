import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["privado", "grupo"],
      default: "privado",
      required: true,
    },

    nombre: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },

    foto: {
      type: String,
      default: "",
    },

    participantes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    administradores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ultimoMensaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    activa: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

conversationSchema.index({
  participantes: 1,
  updatedAt: -1,
});

conversationSchema.index({
  tipo: 1,
  updatedAt: -1,
});

const Conversation = mongoose.model(
  "Conversation",
  conversationSchema,
);

export default Conversation;