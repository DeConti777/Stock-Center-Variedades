import Stripe from "stripe";

declare global {
  var __stockCenterStripe: Stripe | undefined;
  var __stockCenterStripeSecret: string | undefined;
}

/**
 * Retorna mensagem em portugues se a chave nao estiver pronta para uso,
 * ou null se parecer uma Secret key real do painel Stripe.
 */
export function getStripeSecretConfigError(
  key: string | undefined,
): string | null {
  const k = (key ?? "").trim();
  if (!k) {
    return "STRIPE_SECRET_KEY nao esta definida no arquivo .env.";
  }
  if (k.includes("...")) {
    return (
      "STRIPE_SECRET_KEY esta com texto de exemplo (contem ...). " +
      "No Stripe Dashboard em Developers > API keys, copie a Secret key completa " +
      "(comeca com sk_test_ ou sk_live_, costuma ter mais de 100 caracteres), " +
      "substitua a linha inteira no .env e reinicie o servidor."
    );
  }
  if (!k.startsWith("sk_test_") && !k.startsWith("sk_live_")) {
    return "STRIPE_SECRET_KEY deve comecar com sk_test_ (modo teste) ou sk_live_ (producao).";
  }
  if (k.length < 80) {
    return (
      "STRIPE_SECRET_KEY parece incompleta (muito curta). " +
      "Cole a chave inteira do painel Stripe, sem aspas quebradas nem espacos no meio."
    );
  }
  return null;
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const configError = getStripeSecretConfigError(key);
  if (configError) {
    throw new Error(configError);
  }

  if (
    global.__stockCenterStripe &&
    global.__stockCenterStripeSecret !== key
  ) {
    global.__stockCenterStripe = undefined;
  }

  if (!global.__stockCenterStripe) {
    global.__stockCenterStripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
    global.__stockCenterStripeSecret = key;
  }

  return global.__stockCenterStripe;
}
