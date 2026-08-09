import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tipo: {
      type: String,
      enum: [
        "texto",
        "imagen",
        "video",
        "audio",
        "archivo",
        "sistema",
      ],
      default: "texto",
    },

    contenido: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },

    archivo: {
      url: {
        type: String,
        default: "",
      },

      nombre: {
        type: String,
        default: "",
      },

      tipoMime: {
        type: String,
        default: "",
      },

      tamano: {
        type: Number,
        default: 0,
      },
    },

    respondeA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    leidoPor: [
      {
        usuario: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        fecha: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    editado: {
      type: Boolean,
      default: false,
    },

    fechaEdicion: {
      type: Date,
      default: null,
    },

    eliminadoParaTodos: {
      type: Boolean,
      default: false,
    },

    eliminadoPor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

messageSchema.index({
  conversacion: 1,
  createdAt: -1,
});

messageSchema.index({
  autor: 1,
  createdAt: -1,
});

messageSchema.pre("validate", function () {
  const requiereContenido = [
    "texto",
    "sistema",
  ].includes(this.tipo);

  if (requiereContenido && !this.contenido?.trim()) {
    this.invalidate(
      "contenido",
      "El mensaje debe contener texto.",
    );
  }

  const requiereArchivo = [
    "imagen",
    "video",
    "audio",
    "archivo",
  ].includes(this.tipo);

  if (requiereArchivo && !this.archivo?.url) {
    this.invalidate(
      "archivo.url",
      "El mensaje multimedia necesita una URL.",
    );
  }
});

const Message = mongoose.model(
  "Message",
  messageSchema,
);

export default Message;