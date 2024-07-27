import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //* file upload on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      media_metadata: true,
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("upload Error", error);
    fs.unlinkSync(localFilePath); //! remove file on local server
    return null;
  }
};

const deleteAssetsOnCloudinary = async ({ publicId, fileType }) => {
  try {
    if (!publicId) return null;

    //*file delete on cloudinary
    const response = await cloudinary.api.delete_resources([publicId], {
      type: "upload",
      resource_type: fileType,
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};

/**
 * Deletes a local file.
 *
 * @param {string} filePath - The path of the file to be deleted.
 * @throws {ApiError} If an error occurs while deleting the file.
 */

const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File ${filePath} deleted successfully`);
    } else {
      console.log(`File ${filePath} does not exist`);
    }
  } catch {
    throw new ApiError(
      400,
      "Error occurred while deleting ${filePath}: ${err}"
    );
  }
};

export { uploadOnCloudinary, deleteAssetsOnCloudinary, deleteLocalFile };
