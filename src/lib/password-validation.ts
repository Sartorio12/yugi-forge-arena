import { z } from "zod";

export const getPasswordSchema = (t: (key: string) => string) => z.string()
  .min(8, t('auth_page.errors.password_min'))
  .regex(/[a-z]/, t('auth_page.errors.password_lower'))
  .regex(/[A-Z]/, t('auth_page.errors.password_upper'))
  .regex(/[0-9]/, t('auth_page.errors.password_number'))
  .regex(/[^a-zA-Z0-9]/, t('auth_page.errors.password_special'));

export const getPasswordRequirements = (password: string, t: (key: string) => string) => {
  return [
    { label: t('auth_page.errors.password_min'), met: password.length >= 8 },
    { label: t('auth_page.errors.password_lower'), met: /[a-z]/.test(password) },
    { label: t('auth_page.errors.password_upper'), met: /[A-Z]/.test(password) },
    { label: t('auth_page.errors.password_number'), met: /[0-9]/.test(password) },
    { label: t('auth_page.errors.password_special'), met: /[^a-zA-Z0-9]/.test(password) },
  ];
};
