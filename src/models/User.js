import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },

    usuario: {
      type: String,
      required: [true, "El usuario es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },

    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    contrasena: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: 8,
      select: false,
    },

    foto: {
      type: String,
      default: "",
    },

    portada: {
      type: String,
      default: "",
    },

    biografia: {
      type: String,
      default: "",
      maxlength: 160,
    },

    ubicacion: {
      type: String,
      default: "República Dominicana",
    },

    seguidores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    seguidos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    activo: {
      type: Boolean,
      default: false,
    },

    ultimaActividad: {
      type: Date,
      default: Date.now,
    },

    rol: {
      type: String,
      enum: ["usuario", "moderador", "administrador"],
      default: "usuario",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("contrasena")) return;

  this.contrasena = await bcrypt.hash(this.contrasena, 12);
});

userSchema.methods.compararContrasena = function (contrasena) {
  return bcrypt.compare(contrasena, this.contrasena);
};

userSchema.set("toJSON", {
  transform: (documento, objeto) => {
    delete objeto.contrasena;
    return objeto;
  },
});

const User = mongoose.model("User", userSchema);

export default User;