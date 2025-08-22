import { Product } from "../generated/prisma";
import prisma from "../src/config/database";

export const productService = {
  getAll: (tenantId: string): Promise<Product[]> => {
    return prisma.product.findMany({ where: { tenantId } });
  },
  findByName: (tenantId: string, name: string): Promise<Product[]> => {
    return prisma.product.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
        tenantId,
      },
    });
  },
  create: () => {},
};
