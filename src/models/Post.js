import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    comentarios: {
      type: Number,
      min: 0,
      default: 0,
    },

    titulo: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    contenido: {
      type: String,
      required: [true, "El contenido es obligatorio"],
      trim: true,
      maxlength: 3000,
    },

    comunidad: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "Comunidad ReportaRD",
    },

    mediaUrl: {
      type: String,
      trim: true,
      default: "",
    },

    mediaTipo: {
      type: String,
      enum: ["", "imagen", "video"],
      default: "",
    },

    estado: {
      type: String,
      enum: ["publicada", "oculta", "eliminada"],
      default: "publicada",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },


);



postSchema.index({
  titulo: "text",
  contenido: "text",
  comunidad: "text",
});

const Post = mongoose.model("Post", postSchema);

export default Post;