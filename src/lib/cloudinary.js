import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadImageBuffer(buffer, { folder, publicId } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image", overwrite: true },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

export function destroyImage(publicId) {
  if (!publicId) return Promise.resolve(null);
  return cloudinary.uploader.destroy(publicId).catch((error) => {
    console.error("Cloudinary destroy failed:", error);
    return null;
  });
}

export default cloudinary;
