/* eslint-disable @typescript-eslint/no-require-imports */
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./dev.db");

db.serialize(() => {
  console.log("Verificando usuarios no banco...");

  db.all("SELECT id, name, email, role FROM User", (err, rows) => {
    if (err) {
      console.error("Erro:", err);
      return;
    }

    console.log(`Encontrados ${rows.length} usuarios:`);
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.email}) - ${row.role}`);
    });

    const admin = rows.find((row) => row.email === "admin@stockcentervariedades.com.br");
    if (admin) {
      console.log("\nUsuario admin encontrado!");
      console.log(`   Nome: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
    } else {
      console.log("\nUsuario admin NAO encontrado!");
    }

    db.close();
  });
});
