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

export const productService = {
  getAll: async (tenantId: string) => {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenant: tenantId,
        },
      });

      if (!tenant) throw new Error("Bad request");

      const products = await prisma.product.findMany({
        where: { tenantId: tenant.uuid },
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
    } catch (error: any) {
      return { error: error.message };
    }
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
};
