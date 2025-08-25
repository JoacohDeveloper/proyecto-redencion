import { CategoryInput } from "./categoryModel";
import MediaInput from "./mediaModel";
import TenantInput from "./tenantModel";

import { z } from "zod";

export interface ProductInput {
  tenant: TenantInput; // obligatorio
  name: string; // obligatorio
  description?: string; // opcional
  price: number; // obligatorio
  currency?: string; // opcional, por defecto "USD"
  stock?: number; // opcional
  type: "PHYSICAL" | "DIGITAL" | "SERVICE"; // enum
  category: CategoryInput;
  attributes?: Record<string, any>; // JSON dinámico
  media?: MediaInput[]; // opcional, array de imágenes/videos
}

// Esquema para los atributos dinámicos (JSON)
const productAttributesSchema = z.object({
  color: z.string().optional(),
  size: z.string().optional(),
  weight: z.number().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  price: z.number().positive("El precio debe ser positivo"),
  currency: z.string().optional().default("USD"),
  stock: z.number().int().optional(),
  type: z.enum(["PHYSICAL", "DIGITAL", "SERVICE"]),
  attributes: productAttributesSchema.optional(),
});
