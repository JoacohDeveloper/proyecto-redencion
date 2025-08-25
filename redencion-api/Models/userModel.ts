import TenantInput from "./tenantModel";

export default interface UserInput {
  username?: string;
  email: string;
  password: string;
  tenant: TenantInput;
  role?: "CLIENT" | "ADMIN"; // según tu enum Role
}
