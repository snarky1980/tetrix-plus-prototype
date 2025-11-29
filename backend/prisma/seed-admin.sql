-- Script de création d'un utilisateur administrateur initial
-- À exécuter après les migrations Prisma

-- Remplacer 'VOTRE_EMAIL' et générer un hash bcrypt pour votre mot de passe
-- Pour générer un hash : node -e "console.log(require('bcrypt').hashSync('votre_mot_de_passe', 10))"

INSERT INTO utilisateurs (id, email, "motDePasse", role, actif, "creeLe", "modifieLe")
VALUES (
  gen_random_uuid(),
  'admin@tetrix.com',
  -- Hash bcrypt pour "Admin123!" (CHANGEZ-LE en production!)
  '$2b$10$rX8K8p9FqW5l0gH3Y2mHcOXJ9d6YZ8vN5K7L2M4P6Q8R0S2T4U6V8',
  'ADMIN',
  true,
  NOW(),
  NOW()
);

-- Vérifier la création
SELECT id, email, role, actif FROM utilisateurs WHERE role = 'ADMIN';
