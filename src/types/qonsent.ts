
export enum IdentityExposureLevel {
  ANONYMOUS = "anonymous",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export interface QonsentSettings {
  exposureLevel: IdentityExposureLevel;
  moduleSharing: {
    [key: string]: boolean;
  };
  useQmask: boolean;
  qmaskStrength?: "standard" | "advanced";
}
