// Module augmentation to extend the framework's ISpeakerData interface
// This adds the color fields to the existing interface without modifying the framework

declare module 'roundware-web-framework' {
  interface ISpeakerData {
    /** Fill color for the speaker polygon in hex format (with optional alpha) */
    fill_color?: string;
    /** Border color for the speaker polygon in hex format (with optional alpha) */
    border_color?: string;
  }
} 