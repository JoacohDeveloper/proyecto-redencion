import TenantInput from "./tenantModel";
import { z } from "zod";

export interface CategoryInput {
  tenant: TenantInput; // objeto completo
  name: string;
  description?: string;
  parent?: CategoryInput; // categoría padre embebida
  attributes?: Record<string, any>;
}

export type CategoryInputScheme = z.infer<typeof categorySchema>;

export const categorySchema: z.ZodType<{
  name: string;
  description?: string;
  parent?: any; // se resuelve abajo con lazy
  attributes?: Record<string, unknown>;
}> = z.lazy(() =>
  z
    .object({
      name: z.string().min(1, "name es requerido"),
      description: z.string().optional(),
      parent: z.lazy(() => categorySchema).optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
    })
    .strict()
);
