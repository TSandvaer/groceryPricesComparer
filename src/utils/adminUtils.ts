import type { User } from 'firebase/auth';

const ADMIN_EMAIL = 'dev@sandvaer.dk';

export const isAdmin = (user: User | null): boolean => {
  return user?.email === ADMIN_EMAIL;
};
