import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Verificando si existen usuarios en la base de datos...");

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`La base de datos ya cuenta con ${existingUsers} usuario(s). Omitiendo seed.`);
    return;
  }

  console.log("Inicializando usuarios de prueba en SysA+...");

  const adminPasswordHash = bcrypt.hashSync("Admin123!", 10);
  const teacherPasswordHash = bcrypt.hashSync("Profesor123!", 10);
  const studentPasswordHash = bcrypt.hashSync("Alumno123!", 10);

  // 1. Administrador
  await prisma.user.create({
    data: {
      dni: "11111111",
      passwordHash: adminPasswordHash,
      role: "ADMINISTRADOR",
      firstName: "Admin",
      lastName: "SysA+",
      email: "admin@frgp.utn.edu.ar",
      administratorProfile: {
        create: {},
      },
    },
  });

  // 2. Profesor
  await prisma.user.create({
    data: {
      dni: "22222222",
      passwordHash: teacherPasswordHash,
      role: "PROFESOR",
      firstName: "Carlos",
      lastName: "Docente",
      email: "profesor@frgp.utn.edu.ar",
      teacherProfile: {
        create: {},
      },
    },
  });

  // 3. Alumno
  await prisma.user.create({
    data: {
      dni: "33333333",
      passwordHash: studentPasswordHash,
      role: "ALUMNO",
      firstName: "Lucía",
      lastName: "Fernández",
      email: "alumno@frgp.utn.edu.ar",
      studentProfile: {
        create: {
          legajo: "48215",
        },
      },
    },
  });

  console.log("✔ Usuarios iniciales creados exitosamente:");
  console.log("  - Administrador: DNI 11111111 / Clave: Admin123!");
  console.log("  - Profesor:      DNI 22222222 / Clave: Profesor123!");
  console.log("  - Alumno:        DNI 33333333 / Clave: Alumno123!");
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
