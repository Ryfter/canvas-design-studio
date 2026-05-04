export interface InstitutionColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
}

export interface InstitutionConfig {
  institution: string;
  colors: InstitutionColors;
  canvasUrl: string;
  apiToken: string;
}
