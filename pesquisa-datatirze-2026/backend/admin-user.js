const bcrypt = require("bcrypt");

async function ensurePesquisaAdminUser(pool) {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
  `);

  const email = (process.env.PESQUISA_ADMIN_EMAIL || "admin@datatirze.com").trim().toLowerCase();
  const password = process.env.PESQUISA_ADMIN_PASSWORD || "DataTirzeAdmin2026!";
  const nome = process.env.PESQUISA_ADMIN_NOME || "Admin Pesquisa DataTirze";

  const existing = await pool.query("SELECT id, senha, is_admin FROM users WHERE lower(email) = $1", [email]);

  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (nome, email, senha, is_admin) VALUES ($1, $2, $3, TRUE)",
      [nome, email, hash]
    );
    console.log(`[pesquisa] Usuário admin criado: ${email}`);
    return { email, created: true };
  }

  const user = existing.rows[0];
  const updates = [];
  const values = [];

  if (!user.is_admin) {
    values.push(true);
    updates.push(`is_admin = $${values.length}`);
  }

  if (!user.senha || process.env.PESQUISA_ADMIN_RESET_PASSWORD === "true") {
    const hash = await bcrypt.hash(password, 10);
    values.push(hash);
    updates.push(`senha = $${values.length}`);
  }

  values.push(nome);
  updates.push(`nome = $${values.length}`);

  values.push(email);
  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE lower(email) = $${values.length}`,
    values
  );

  console.log(`[pesquisa] Usuário admin garantido: ${email}`);
  return { email, created: false };
}

module.exports = { ensurePesquisaAdminUser };
