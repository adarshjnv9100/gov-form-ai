import { useAuth } from '../context/AuthContext';

export const useUser = () => {
  const { user, session, profile, loading } = useAuth();
  return { user, session, profile, loading };
};
