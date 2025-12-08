export {};

// Create a type for the roles
export type Roles = "admin" | "user";
export type Routes = string[];
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      routes?: Routes;
    };
  }
}
