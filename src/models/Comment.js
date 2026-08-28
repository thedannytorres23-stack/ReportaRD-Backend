import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    contenido: {
      type: String,
      required: [true, "El comentario es obligatorio"],
      trim: true,
      maxlength: 1000,
    },

    tipoContenido: {
      type: String,
      enum: ["post", "report"],
      required: true,
      index: true,
    },

    contenidoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    respuestaA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    estado: {
      type: String,
      enum: ["publicado", "eliminado"],
      default: "publicado",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

commentSchema.index({
  tipoContenido: 1,
  contenidoId: 1,
  createdAt: 1,
});

const Comment = mongoose.model(
  "Comment",
  commentSchema,
);

export default Comment;