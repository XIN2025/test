import React, { createContext, useContext, PropsWithChildren } from 'react';

type UserContextValue = {
  userEmail: string;
  userName?: string;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ value, children }: PropsWithChildren<{ value: UserContextValue }>) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    // Provide a safe default to avoid crashes before provider mounts
    return { userEmail: '', userName: '' } as UserContextValue;
  }
  return ctx;
}
