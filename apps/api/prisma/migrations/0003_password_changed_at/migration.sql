-- Date du dernier changement de mot de passe (réinitialisation depuis le back-office).
-- Les sessions ouvertes avant cette date sont refusées par l'API.
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMPTZ(3);
