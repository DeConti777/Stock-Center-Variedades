-- Criar usuário admin
INSERT OR REPLACE INTO User (id, name, email, role, passwordHash, createdAt, updatedAt)
VALUES (
  'admin-user-id',
  'Administrador',
  'admin@stockcentervariedades.com.br',
  'ADMIN',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fM/vE8Xm',
  datetime('now'),
  datetime('now')
);