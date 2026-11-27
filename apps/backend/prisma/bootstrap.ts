import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name} para crear el administrador inicial`);
  return value;
}

async function main() {
  const dni = required("ADMIN_DNI");
  const email = required("ADMIN_EMAIL");
  const firstName = required("ADMIN_FIRST_NAME");
  const lastName = required("ADMIN_LAST_NAME");
  const password = required("ADMIN_PASSWORD");
  if (!/^\d{7,8}$/.test(dni) || !email.includes("@") || email.length > 255 || firstName.length > 100 || lastName.length > 100 || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Usá un DNI y email válidos, nombres de hasta 100 caracteres y una contraseña de 12 caracteres como mínimo y 72 bytes como máximo");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async tx => {
    if (await tx.user.count({ where: { role: "ADMINISTRADOR" } })) {
      console.log("Ya existe un administrador. No se modificaron usuarios ni credenciales.");
      return;
    }
    await tx.user.create({ data: {
      dni, email, firstName, lastName, passwordHash, role: "ADMINISTRADOR",
      administratorProfile: { create: {} },
    } });
    console.log("Administrador inicial creado. La oferta académica se carga desde la aplicación.");
  }, { isolationLevel: "Serializable" });
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
