import { CategoryInput } from "./categoryModel";
import MediaInput from "./mediaModel";
import TenantInput from "./tenantModel";

export default interface ProductInput {
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
