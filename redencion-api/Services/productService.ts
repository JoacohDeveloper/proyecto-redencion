import { Product } from "../generated/prisma";
import prisma from "../src/config/database";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import stream from "stream";
import MediaUpload from "../Models/mediaModel";
import { ca } from "zod/locales";
dotenv.config;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloudinary(
  file: Express.Multer.File,
  tenantId: string
): Promise<MediaUpload> {
  return new Promise((resolve, reject) => {
    const isVideo = file.mimetype.startsWith("video/");
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: isVideo ? "video" : "image",
        folder: tenantId,
      },
      (error, result) => {
        if (error) return reject(error);

        const media: MediaUpload = {
          url: result?.secure_url,
          type: result?.resource_type === "video" ? "VIDEO" : "IMAGE",
          public_id: result?.public_id,
          format: result?.format,
          width: result?.width,
          height: result?.height,
          duration: result?.duration, // solo aplica en video
          size: result?.bytes,
        };

        resolve(media);
      }
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);
    bufferStream.pipe(uploadStream);
  });
}

async function deleteFromCloudinary(publicId: string, type: "IMAGE" | "VIDEO") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: type.toLowerCase() },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

export const productService = {
  getAll: async (tenantId: string, page: number = 1, pageSize: number = 10) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { tenant: tenantId },
      });

      if (!tenant) throw new Error("Bad request");

      const skip = (page - 1) * pageSize;

      // contar total de productos
      const totalProducts = await prisma.product.count({
        where: { tenantId: tenant.uuid },
      });

      // obtener productos con paginación
      const products = await prisma.product.findMany({
        where: { tenantId: tenant.uuid },
        skip,
        take: pageSize,
      });

      const productsWImagesACategory = await Promise.all(
        products.map(async (product) => {
          const imagenesProducts = await prisma.media.findMany({
            where: { productId: product.id },
          });

          const category = await prisma.category.findFirst({
            where: {
              id: product.categoryId ?? "",
              tenantId: product.tenantId,
            },
          });

          return {
            ...product,
            images: imagenesProducts,
            category,
          };
        })
      );

      return {
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / pageSize),
        products: productsWImagesACategory,
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  findById: async (tenantId, productId) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");

      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId: tenant.uuid,
        },
      });

      if (!product) return { message: "Product not found" };

      const imagenesProducts = await prisma.media.findMany({
        where: { productId: product.id },
      });

      const category = await prisma.category.findFirst({
        where: {
          id: product.categoryId ?? "",
          tenantId: product.tenantId,
        },
      });

      return {
        ...product,
        images: imagenesProducts,
        category: category,
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  findByName: async (tenantId: string, name: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");

      const products = await prisma.product.findMany({
        where: {
          tenantId: tenant.uuid,
          name: {
            contains: name,
            mode: "insensitive",
          },
        },
      });

      const productsWImagesACategory = await Promise.all(
        products.map(async (product) => {
          const imagenesProducts = await prisma.media.findMany({
            where: { productId: product.id },
          });

          const category = await prisma.category.findFirst({
            where: {
              id: product.categoryId ?? "",
              tenantId: product.tenantId,
            },
          });

          return {
            ...product,
            images: imagenesProducts,
            category: category,
          };
        })
      );

      return productsWImagesACategory;
    } catch (error) {
      return { error: error.message };
    }
  },
  create: async (
    tenantId: string,
    categoryId: string,
    name: string,
    price: number,
    currency: string,
    type: "PHYSICAL" | "DIGITAL" | "SERVICE",
    description: string,
    stock: number,
    files: Express.Multer.File[]
  ) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");
      const category = await prisma.category.findFirst({
        where: {
          tenantId: tenant.uuid,
          id: categoryId,
        },
      });

      if (!category) return { message: "Category do not exists" };

      return await prisma.$transaction(async ($tx) => {
        const productResult = await $tx.product.create({
          data: {
            name,
            price,
            type,
            categoryId,
            currency,
            tenantId: tenant.uuid,
            stock,
            description,
          },
        });

        //subir a cloudinary
        const result = await Promise.all(
          files.map((file) => uploadToCloudinary(file, tenant.uuid))
        );
        const mediaUploaded = await Promise.all(
          result.map((uploadedFile) =>
            $tx.media.create({
              data: {
                productId: productResult.id,
                publicId: uploadedFile.public_id ?? "",
                url: uploadedFile.url ?? "",
                duration: uploadedFile.duration,
                size: uploadedFile.size,
                width: uploadedFile.width,
                format: uploadedFile.format,
                type: uploadedFile.type,
                height: uploadedFile.height,
              },
            })
          )
        );
        return { productResult, mediaUploaded };
      });
    } catch (error) {
      return { error: error.message };
    }
  },
  modify: async (
    tenantId: string,
    categoryId: string,
    name: string,
    price: number,
    currency: string,
    type: "PHYSICAL" | "DIGITAL" | "SERVICE",
    description: string,
    stock: number,
    files: Express.Multer.File[],
    deletedIds: string[],
    productId: string
  ) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { tenant: tenantId },
      });

      if (!tenant) throw new Error("Bad request");

      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId: tenant.uuid },
      });

      if (!product) return { message: "Product does not exist" };

      const category = await prisma.category.findFirst({
        where: { tenantId: tenant.uuid, id: categoryId },
      });

      if (!category) return { message: "Category does not exist" };

      return await prisma.$transaction(async ($tx) => {
        // Actualizar producto
        const productResult = await $tx.product.update({
          data: { name, price, type, categoryId, currency, stock, description },
          where: { id: productId, tenantId: tenant.uuid },
        });

        // Eliminar medias
        if (deletedIds?.length > 0) {
          await Promise.all(
            deletedIds.map(async (mediaId) => {
              const dbMedia = await $tx.media.findFirst({
                where: { productId, publicId: mediaId },
              });

              if (dbMedia) {
                const result = await deleteFromCloudinary(
                  mediaId,
                  dbMedia.type
                );
                if (result) {
                  await $tx.media.delete({
                    where: { id: dbMedia.id }, // no pasamos undefined
                  });
                }
              }
            })
          );
        }

        // Subir a Cloudinary

        if (files?.length > 0) {
          const result = await Promise.all(
            files.map((file) => uploadToCloudinary(file, tenant.uuid))
          );

          const mediaUploaded = await Promise.all(
            result.map((uploadedFile) =>
              $tx.media.create({
                data: {
                  productId: productResult.id,
                  publicId: uploadedFile.public_id ?? "",
                  url: uploadedFile.url ?? "",
                  duration: uploadedFile.duration,
                  size: uploadedFile.size,
                  width: uploadedFile.width,
                  format: uploadedFile.format,
                  type: uploadedFile.type,
                  height: uploadedFile.height,
                },
              })
            )
          );
          return { productResult, mediaUploaded };
        }
      });
    } catch (error: any) {
      return { error: error.message };
    }
  },
  delete: async (tenantId: string, productId: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { tenant: tenantId },
      });
      if (!tenant) throw new Error("Bad request");

      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId: tenant.uuid },
      });
      if (!product) return { message: "Product not found" };

      // eliminamos en DB primero (transacción segura)
      const media = await prisma.media.findMany({
        where: { productId: product.id },
      });

      await prisma.$transaction(async ($tx) => {
        await $tx.media.deleteMany({ where: { productId: product.id } });
        await $tx.product.delete({
          where: { id: product.id, tenantId: tenant.uuid },
        });
      });

      // después eliminamos en Cloudinary (no transaccional)
      await Promise.all(
        media.map((file) => deleteFromCloudinary(file.publicId, file.type))
      );

      return { message: `'${product.name}' successfully deleted` };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};
