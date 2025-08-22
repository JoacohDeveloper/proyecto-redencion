import TenantInput from "./tenantModel";

export interface CategoryInput {
  tenant: TenantInput; // objeto completo
  name: string;
  description?: string;
  parent?: CategoryInput; // categoría padre embebida
  attributes?: Record<string, any>;
}
