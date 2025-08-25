export default interface MediaUpload {
  url?: string;
  type: "IMAGE" | "VIDEO";
  public_id?: string;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}
