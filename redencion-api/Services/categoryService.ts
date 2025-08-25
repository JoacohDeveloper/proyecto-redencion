import prisma from "../src/config/database";
import { Category } from "../generated/prisma";
export const CategoryService = {
  create: async (name: string, description: string, tenantId: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");
      const alreadyExists = await prisma.category.findFirst({
        where: {
          name,
        },
      });

      if (alreadyExists) return { message: "Category already exist" };

      const newCategory = await prisma.category.create({
        data: {
          name,
          description,
          tenantId: tenant.uuid,
        },
      });

      if (!newCategory) return null;

      return {
        message: "Category Successfuly created",
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  createNested: async (
    name: string,
    description: string,
    tenantId,
    nestedId: string
  ) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");

      const parentCategory = await prisma.category.findFirst({
        where: {
          id: nestedId,
        },
      });

      if (!parentCategory) return { message: "Parent Category do not exist" };

      const alreadyExists = await prisma.category.findFirst({
        where: {
          name,
          parentId: nestedId,
        },
      });

      if (alreadyExists) return { message: "Category already exist" };

      const newCategory = await prisma.category.create({
        data: {
          name,
          description,
          tenantId: tenant.uuid,
          parentId: nestedId,
        },
      });

      if (!newCategory) return null;

      return {
        message: "Category Successfuly created",
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  delete: async (id: string, tenantId: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");

      const result = await prisma.category.delete({
        where: {
          id,
        },
      });

      if (result)
        return { message: `Category '${result.name}' Successfuly deleted.` };
      return null;
    } catch (error) {
      return { error: error.message };
    }
  },
  all: async (tenantId: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");

      return await prisma.category.findMany({
        where: {
          tenantId: tenant.uuid,
        },
      });
    } catch (error) {
      return { error: error.message };
    }
  },

  find: async (tenantId: string, predicate: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });
      if (!tenant) throw new Error("Bad request");
      const categories = await prisma.category.findMany({
        where: {
          name: {
            contains: predicate,
            mode: "insensitive",
          },
          tenantId: tenant.uuid,
        },
      });

      return categories;
    } catch (error) {
      return { error: error.message };
    }
  },

  findNesteds: async (
    tenantId: string,
    predicate: string,
    parentId: string
  ) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });
      if (!tenant) throw new Error("Bad request");
      const categories = await prisma.category.findMany({
        where: {
          name: {
            contains: predicate,
            mode: "insensitive",
          },
          parentId,
          tenantId,
        },
      });

      return categories;
    } catch (error) {
      return { error: error.message };
    }
  },

  findById: async (tenantId: string, categoryId: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });
      if (!tenant) throw new Error("Bad request");
      const category = await prisma.category.findFirstOrThrow({
        where: {
          tenantId: tenant.uuid,
          id: categoryId,
        },
      });

      return category;
    } catch (error) {
      return { error: error.message };
    }
  },

  modify: async (
    name: string,
    description: string,
    tenantId: string,
    categoryId: string
  ) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");
      const alreadyExists = await prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId: tenant.uuid,
        },
      });

      if (!alreadyExists) return { message: "Category do not exist" };

      const alreadyExistsNamed = await prisma.category.findFirst({
        where: {
          name,
          tenantId: tenant.uuid,
        },
      });

      if (alreadyExistsNamed) return { message: "Category already exist" };
      const newCategory = await prisma.category.update({
        data: {
          name,
          description,
        },
        where: {
          id: categoryId,
          tenantId: tenant.uuid,
        },
      });

      if (!newCategory) return null;

      return {
        message: "Category Successfuly updated",
      };
    } catch (error) {
      return { error: error.message };
    }
  },
};
