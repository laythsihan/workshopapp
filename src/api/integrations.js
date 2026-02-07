/**
 * MOCK INTEGRATIONS
 * These were originally powered by the Base44 Core engine.
 * We are exporting "Empty" versions so the UI components importing them 
 * (like the Upload or AI pages) don't crash the entire app on load.
 */

// A dummy function that does nothing but prevents "is not a function" errors
const mockAsyncFunc = async () => {
  console.warn("This feature is currently disabled during migration.");
  return null;
};

export const Core = {
  InvokeLLM: mockAsyncFunc,
  SendEmail: mockAsyncFunc,
  UploadFile: mockAsyncFunc,
  GenerateImage: mockAsyncFunc,
  ExtractDataFromUploadedFile: mockAsyncFunc,
  CreateFileSignedUrl: mockAsyncFunc,
  UploadPrivateFile: mockAsyncFunc
};

// Exporting individual constants to satisfy direct imports in pages like upload.jsx
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;






