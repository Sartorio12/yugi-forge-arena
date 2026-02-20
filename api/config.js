export const MERCADOPAGO_CONFIG = {
  ACCESS_TOKEN: "APP_USR-446203817476368-020410-a9222d665687f09818646349b5d01cf7-1251558310",
  PUBLIC_KEY: "APP_USR-59febb8c-0e5f-42a5-a741-4a49654b9ab9",
  USER_ID: "1251558310" // Extracted from Access Token suffix roughly, or usually not needed for payment creation directly if we have token
};

export const PAYPAL_CONFIG = {
  CLIENT_ID: "AVQN1-0milqtBFAKCtJEOs2Bmt9msTYqk022Pm_EEoBHhzLy5YBEdS1AA4Tot6KBAY94zfTcXom-rrHH",
  SECRET: "EAv_gGvWTHNVXuyFBZO8cz8iuFsQtOAHfia5fgvSM2IVbZoRD7NMciDL33Z4qbkBNsbCRvvQTmSUeLw5",
  API_URL: "https://api-m.sandbox.paypal.com" // Change to https://api-m.paypal.com for production
};

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
